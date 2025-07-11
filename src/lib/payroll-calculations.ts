import { refacSupabaseAdmin } from './refac-supabase';
import { 
  withRetry, 
  createPayrollError, 
  PAYROLL_ERROR_CODES,
  validateCompensationCompleteness,
  logPayrollError
} from './payroll-error-handling';
import {
  withCacheAndPerformance,
  CacheKeys,
  BatchOperations,
  buildOptimizedTimeEntryQuery,
  loadingStateManager
} from './payroll-performance';

// Types for payroll calculations
export interface TimeEntry {
  id: number;
  staff_id: number;
  timestamp: string;
  action: 'clock_in' | 'clock_out';
  photo_url?: string;
}

export interface DailyHours {
  date: string;
  staff_id: number;
  total_hours: number;
  sessions: Array<{
    clock_in: string;
    clock_out: string;
    duration_hours: number;
  }>;
  has_missing_clockout: boolean;
}

export interface WeeklyHours {
  week_start: string;
  staff_id: number;
  total_hours: number;
  overtime_hours: number;
}

export interface StaffCompensation {
  staff_id: number;
  compensation_type: 'salary' | 'hourly';
  base_salary: number;
  hourly_rate: number;
  ot_rate_per_hour: number;
  holiday_rate_per_hour: number;
  is_service_charge_eligible: boolean;
}

export interface PayrollCalculationResult {
  staff_id: number;
  staff_name: string;
  compensation_type: 'salary' | 'hourly';
  working_days: number;
  total_hours: number;
  overtime_hours: number;
  holiday_hours: number;
  base_salary: number;
  hourly_rate: number;
  base_pay: number;
  daily_allowance: number;
  overtime_pay: number;
  holiday_pay: number;
  service_charge: number;
  total_payout: number;
}

/**
 * Get all time entries for a specific month (optimized with caching)
 */
export async function getTimeEntriesForMonth(monthYear: string): Promise<TimeEntry[]> {
  return withCacheAndPerformance(
    'getTimeEntriesForMonth',
    CacheKeys.timeEntries(monthYear),
    async () => {
      const queryOptions = buildOptimizedTimeEntryQuery({ monthYear });
      
      const { data, error } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('time_entries')
        .select('id, staff_id, timestamp, action, photo_url')
        .gte('timestamp', queryOptions.filters.timestamp_gte)
        .lte('timestamp', queryOptions.filters.timestamp_lte)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching time entries:', error);
        throw new Error(`Failed to fetch time entries: ${error.message}`);
      }

      return data || [];
    },
    10 * 60 * 1000, // Cache for 10 minutes
    1 // Single query
  );
}

/**
 * Calculate daily hours for all staff in a month (optimized with caching)
 */
export async function calculateDailyHours(monthYear: string): Promise<DailyHours[]> {
  return withCacheAndPerformance(
    'calculateDailyHours',
    CacheKeys.dailyHours(monthYear),
    async () => {
      const timeEntries = await getTimeEntriesForMonth(monthYear);
      
      // Group by staff and date
      const dailyGroups = new Map<string, TimeEntry[]>();
      
      for (const entry of timeEntries) {
        const entryDate = new Date(entry.timestamp);
        const dateStr = entryDate.toISOString().split('T')[0];
        const key = `${entry.staff_id}-${dateStr}`;
        
        if (!dailyGroups.has(key)) {
          dailyGroups.set(key, []);
        }
        dailyGroups.get(key)!.push(entry);
      }

      const dailyHours: DailyHours[] = [];

      for (const [key, entries] of Array.from(dailyGroups.entries())) {
        const dashIndex = key.indexOf('-');
        const staffId = key.substring(0, dashIndex);
        const date = key.substring(dashIndex + 1);
        const staff_id = parseInt(staffId);
        
        // Sort entries by timestamp
        entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        // Pair clock_in and clock_out entries
        const sessions = [];
        let clockInEntry: TimeEntry | null = null;
        let totalHours = 0;
        let hasMissingClockout = false;

        for (const entry of entries) {
          if (entry.action === 'clock_in') {
            clockInEntry = entry;
          } else if (entry.action === 'clock_out' && clockInEntry) {
            const clockIn = new Date(clockInEntry.timestamp);
            const clockOut = new Date(entry.timestamp);
            
            const durationMs = clockOut.getTime() - clockIn.getTime();
            const durationHours = durationMs / (1000 * 60 * 60);
            
            // Only add positive duration hours
            if (durationHours > 0) {
              sessions.push({
                clock_in: clockInEntry.timestamp,
                clock_out: entry.timestamp,
                duration_hours: durationHours
              });
              
              totalHours += durationHours;
            }
            
            clockInEntry = null;
          }
        }

        // Check for missing clock-out
        if (clockInEntry) {
          hasMissingClockout = true;
        }

        dailyHours.push({
          date,
          staff_id,
          total_hours: totalHours,
          sessions,
          has_missing_clockout: hasMissingClockout
        });
      }

      return dailyHours;
    },
    10 * 60 * 1000, // Cache for 10 minutes
    1 // Single derived calculation
  );
}

/**
 * Calculate weekly hours and overtime for all staff in a month (optimized with caching)
 */
export async function calculateWeeklyHours(monthYear: string): Promise<WeeklyHours[]> {
  return withCacheAndPerformance(
    'calculateWeeklyHours',
    CacheKeys.weeklyHours(monthYear),
    async () => {
      const dailyHours = await calculateDailyHours(monthYear);
      
      // Get holidays for the month to exclude from overtime calculation
      const startDate = `${monthYear}-01`;
      const endDate = new Date(monthYear + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data: holidays, error: holidaysError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('public_holidays')
        .select('holiday_date')
        .gte('holiday_date', startDate)
        .lte('holiday_date', endDateStr)
        .eq('is_active', true);

      if (holidaysError) {
        console.error('Error fetching holidays for weekly calculation:', holidaysError);
        // Continue without holiday exclusion if there's an error
      }

      const holidayDates = new Set((holidays || []).map(h => h.holiday_date));
      
      // Group by staff and week
      const weeklyGroups = new Map<string, DailyHours[]>();
      
      for (const daily of dailyHours) {
        // Parse date properly - daily.date should be in 'YYYY-MM-DD' format
        const date = new Date(daily.date + 'T12:00:00'); // Add time to avoid timezone issues
        const weekStart = getWeekStart(date);
        const key = `${daily.staff_id}-${weekStart}`;
        
        if (!weeklyGroups.has(key)) {
          weeklyGroups.set(key, []);
        }
        weeklyGroups.get(key)!.push(daily);
      }

      const weeklyHours: WeeklyHours[] = [];

      for (const [key, days] of Array.from(weeklyGroups.entries())) {
        const dashIndex = key.indexOf('-');
        const staffId = key.substring(0, dashIndex);
        const weekStart = key.substring(dashIndex + 1);
        const staff_id = parseInt(staffId);
        
        // Calculate total hours and non-holiday hours
        const totalHours = days.reduce((sum, day) => sum + day.total_hours, 0);
        const nonHolidayHours = days.reduce((sum, day) => {
          // Exclude hours worked on holidays from overtime calculation
          if (holidayDates.has(day.date)) {
            return sum; // Don't add holiday hours to regular/OT calculation
          }
          return sum + day.total_hours;
        }, 0);
        
        // Calculate overtime only on non-holiday hours
        const overtimeHours = Math.max(0, nonHolidayHours - 48);
        
        weeklyHours.push({
          week_start: weekStart,
          staff_id,
          total_hours: totalHours, // Keep total for reporting
          overtime_hours: overtimeHours // But calculate OT only on non-holiday hours
        });
      }

      return weeklyHours;
    },
    10 * 60 * 1000, // Cache for 10 minutes
    2 // Now includes holiday query + daily hours calculation
  );
}

/**
 * Calculate holiday hours for all staff in a month (optimized with caching)
 */
export async function calculateHolidayHours(monthYear: string): Promise<Map<number, number>> {
  return withCacheAndPerformance(
    'calculateHolidayHours',
    CacheKeys.holidayHours(monthYear),
    async () => {
      // Get public holidays for the month
      const startDate = `${monthYear}-01`;
      const endDate = new Date(monthYear + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data: holidays, error: holidaysError } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('public_holidays')
        .select('holiday_date')
        .gte('holiday_date', startDate)
        .lte('holiday_date', endDateStr)
        .eq('is_active', true);

      if (holidaysError) {
        console.error('Error fetching holidays:', holidaysError);
        throw new Error(`Failed to fetch holidays: ${holidaysError.message}`);
      }

      if (!holidays || holidays.length === 0) {
        return new Map(); // No holidays in this month
      }

      const holidayDates = new Set(holidays.map(h => h.holiday_date));
      const dailyHours = await calculateDailyHours(monthYear);
      
      // Calculate holiday hours per staff
      const holidayHours = new Map<number, number>();
      
      for (const daily of dailyHours) {
        if (holidayDates.has(daily.date)) {
          const currentHours = holidayHours.get(daily.staff_id) || 0;
          holidayHours.set(daily.staff_id, currentHours + daily.total_hours);
        }
      }

      return holidayHours;
    },
    10 * 60 * 1000, // Cache for 10 minutes
    2 // Two database queries
  );
}

/**
 * Calculate working days for all staff in a month (optimized with caching)
 */
export async function calculateWorkingDays(monthYear: string): Promise<Map<number, number>> {
  return withCacheAndPerformance(
    'calculateWorkingDays',
    CacheKeys.workingDays(monthYear),
    async () => {
      const dailyHours = await calculateDailyHours(monthYear);
      const workingDays = new Map<number, number>();
      
      for (const daily of dailyHours) {
        if (daily.total_hours >= 6) { // Working day = >= 6 hours
          const currentDays = workingDays.get(daily.staff_id) || 0;
          workingDays.set(daily.staff_id, currentDays + 1);
        }
      }

      return workingDays;
    },
    10 * 60 * 1000, // Cache for 10 minutes
    1 // Single derived calculation
  );
}

/**
 * Get staff compensation settings (optimized with caching)
 */
export async function getStaffCompensation(monthYear: string): Promise<Map<number, StaffCompensation>> {
  return withCacheAndPerformance(
    'getStaffCompensation',
    CacheKeys.staffCompensation(monthYear),
    async () => {
      const endOfMonth = new Date(monthYear + '-01');
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      const endOfMonthStr = endOfMonth.toISOString().split('T')[0];

      const { data: compensation, error } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('staff_compensation')
        .select(`
          staff_id,
          compensation_type,
          base_salary,
          hourly_rate,
          ot_rate_per_hour,
          holiday_rate_per_hour,
          is_service_charge_eligible,
          staff!inner(staff_name, is_active)
        `)
        .lte('effective_from', endOfMonthStr)
        .or(`effective_to.is.null,effective_to.gte.${endOfMonthStr}`)
        .eq('staff.is_active', true);

      if (error) {
        console.error('Error fetching staff compensation:', error);
        throw new Error(`Failed to fetch staff compensation: ${error.message}`);
      }

      const compensationMap = new Map<number, StaffCompensation>();
      
      for (const comp of compensation || []) {
        compensationMap.set(comp.staff_id, {
          staff_id: comp.staff_id,
          compensation_type: comp.compensation_type || 'salary',
          base_salary: comp.base_salary,
          hourly_rate: comp.hourly_rate || 0,
          ot_rate_per_hour: comp.ot_rate_per_hour,
          holiday_rate_per_hour: comp.holiday_rate_per_hour,
          is_service_charge_eligible: comp.is_service_charge_eligible
        });
      }

      return compensationMap;
    },
    15 * 60 * 1000, // Cache for 15 minutes (settings change less frequently)
    1 // Single query
  );
}

/**
 * Get daily allowance setting (optimized with caching)
 */
export async function getDailyAllowance(): Promise<number> {
  return withCacheAndPerformance(
    'getDailyAllowance',
    CacheKeys.dailyAllowance(),
    async () => {
      const { data, error } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('payroll_settings')
        .select('setting_value')
        .eq('setting_key', 'daily_allowance_thb')
        .single();

      if (error) {
        console.error('Error fetching daily allowance:', error);
        return 100; // Default fallback
      }

      return parseFloat(data.setting_value) || 100;
    },
    30 * 60 * 1000, // Cache for 30 minutes (settings change infrequently)
    1 // Single query
  );
}

/**
 * Get service charge for a month (optimized with caching)
 */
export async function getServiceCharge(monthYear: string): Promise<number> {
  return withCacheAndPerformance(
    'getServiceCharge',
    CacheKeys.serviceCharge(monthYear),
    async () => {
      const { data, error } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('monthly_service_charge')
        .select('total_amount')
        .eq('month_year', monthYear)
        .single();

      if (error) {
        // No service charge set for this month
        return 0;
      }

      return data.total_amount || 0;
    },
    15 * 60 * 1000, // Cache for 15 minutes
    1 // Single query
  );
}

/**
 * Main function to calculate payroll for a month (optimized with caching and performance monitoring)
 */
export async function calculatePayrollForMonth(monthYear: string): Promise<PayrollCalculationResult[]> {
  return withCacheAndPerformance(
    'calculatePayrollForMonth',
    CacheKeys.payrollCalculation(monthYear),
    async () => {
      try {
        console.log(`Calculating payroll for ${monthYear}...`);
        loadingStateManager.startOperation('Calculating payroll data', 10000);

        // Use batch operations for better performance monitoring
        const batchOps = new BatchOperations();
        
        batchOps
          .add('weeklyHours', () => withRetry(() => calculateWeeklyHours(monthYear)), 3)
          .add('holidayHours', () => withRetry(() => calculateHolidayHours(monthYear)), 2)
          .add('workingDays', () => withRetry(() => calculateWorkingDays(monthYear)), 2)
          .add('staffCompensation', () => withRetry(() => getStaffCompensation(monthYear)), 1)
          .add('dailyAllowance', () => withRetry(() => getDailyAllowance()), 1)
          .add('serviceCharge', () => withRetry(() => getServiceCharge(monthYear)), 1);

        loadingStateManager.updateProgress(20);
        const batchResults = await batchOps.execute();
        loadingStateManager.updateProgress(60);

        // Type the batch results properly
        const weeklyHours = batchResults.weeklyHours as WeeklyHours[];
        const holidayHours = batchResults.holidayHours as Map<number, number>;
        const workingDays = batchResults.workingDays as Map<number, number>;
        const staffCompensation = batchResults.staffCompensation as Map<number, StaffCompensation>;
        const dailyAllowance = batchResults.dailyAllowance as number;
        const serviceCharge = batchResults.serviceCharge as number;

        // Get all active staff with retry logic
        const { data: allStaff, error: staffError } = await withRetry(async () => 
          await refacSupabaseAdmin
            .schema('backoffice')
            .from('staff')
            .select('id, staff_name, is_active')
            .eq('is_active', true)
        );

        if (staffError) {
          const error = createPayrollError(
            PAYROLL_ERROR_CODES.DATABASE_QUERY_FAILED,
            'Failed to fetch staff data',
            staffError.message,
            true,
            'Unable to load staff information. Please check your connection and try again.'
          );
          logPayrollError(error, { operation: 'fetch_staff', month: monthYear });
          throw error;
        }

        // Validate compensation completeness
        const compensationValidation = validateCompensationCompleteness(
          staffCompensation,
          allStaff || []
        );

        if (!compensationValidation.isValid) {
          const error = createPayrollError(
            PAYROLL_ERROR_CODES.MISSING_COMPENSATION_SETTINGS,
            'Missing compensation settings',
            compensationValidation.errors.join('; '),
            false,
            compensationValidation.errors.join(' ')
          );
          logPayrollError(error, { operation: 'validate_compensation', month: monthYear });
          throw error;
        }

        // Log warnings about low compensation
        if (compensationValidation.warnings.length > 0) {
          console.warn('Compensation warnings:', compensationValidation.warnings);
        }

        // Calculate service charge per eligible staff
        const eligibleStaffCount = Array.from(staffCompensation.values())
          .filter(comp => comp.is_service_charge_eligible).length;
        const serviceChargePerStaff = eligibleStaffCount > 0 ? serviceCharge / eligibleStaffCount : 0;

        // Calculate payroll for each staff member
        const results: PayrollCalculationResult[] = [];

        for (const staff of allStaff || []) {
          const staffId = staff.id;
          const compensation = staffCompensation.get(staffId);
          
          if (!compensation) {
            // This should not happen due to validation above, but keep as safety check
            console.warn(`No compensation settings found for staff ${staffId} (${staff.staff_name})`);
            continue;
          }

          // Calculate totals for this staff member
          const staffWeeklyHours = weeklyHours.filter(w => w.staff_id === staffId);
          const totalHours = staffWeeklyHours.reduce((sum, w) => sum + w.total_hours, 0);
          const overtimeHours = staffWeeklyHours.reduce((sum, w) => sum + w.overtime_hours, 0);
          const staffHolidayHours = holidayHours.get(staffId) || 0;
          const staffWorkingDays = workingDays.get(staffId) || 0;

          // Calculate payments based on compensation type
          let basePay = 0;
          let allowance = 0;
          
          if (compensation.compensation_type === 'salary') {
            // Salary staff: fixed base salary + daily allowance
            basePay = compensation.base_salary;
            allowance = staffWorkingDays * dailyAllowance;
          } else if (compensation.compensation_type === 'hourly') {
            // Hourly staff: total hours × hourly rate, no allowance
            basePay = totalHours * compensation.hourly_rate;
            allowance = 0; // Hourly staff don't get daily allowance
          }
          
          const overtimePay = overtimeHours * compensation.ot_rate_per_hour;
          const holidayPay = staffHolidayHours * compensation.holiday_rate_per_hour;
          const staffServiceCharge = compensation.is_service_charge_eligible ? serviceChargePerStaff : 0;
          const totalPayout = basePay + allowance + overtimePay + holidayPay + staffServiceCharge;

          results.push({
            staff_id: staffId,
            staff_name: staff.staff_name,
            compensation_type: compensation.compensation_type,
            working_days: staffWorkingDays,
            total_hours: totalHours,
            overtime_hours: overtimeHours,
            holiday_hours: staffHolidayHours,
            base_salary: compensation.compensation_type === 'salary' ? compensation.base_salary : 0,
            hourly_rate: compensation.compensation_type === 'hourly' ? compensation.hourly_rate : 0,
            base_pay: basePay,
            daily_allowance: allowance,
            overtime_pay: overtimePay,
            holiday_pay: holidayPay,
            service_charge: staffServiceCharge,
            total_payout: totalPayout
          });
        }

        loadingStateManager.updateProgress(100);
        console.log(`Payroll calculation completed for ${results.length} staff members`);
        loadingStateManager.endOperation();
        return results;

      } catch (error) {
        loadingStateManager.endOperation();
        if (error instanceof Error && error.message.includes('PAYROLL_ERROR')) {
          // Re-throw PayrollError as-is
          throw error;
        }
        
        // Wrap unexpected errors
        const payrollError = createPayrollError(
          PAYROLL_ERROR_CODES.INSUFFICIENT_DATA,
          'Payroll calculation failed',
          error instanceof Error ? error.message : 'Unknown error',
          true,
          'Unable to calculate payroll. Please ensure all required data is available and try again.'
        );
        
        logPayrollError(payrollError, { operation: 'calculate_payroll', month: monthYear });
        throw payrollError;
      }
    },
    15 * 60 * 1000, // Cache for 15 minutes
    6 // Multiple database operations
  );
}

/**
 * Helper function to get Sunday of the week for a given date (Sunday-Saturday week)
 */
function getWeekStart(date: Date): string {
  const d = new Date(date.getTime()); // Create a proper copy to avoid mutation
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  d.setDate(d.getDate() - day); // Subtract the day number to get to Sunday
  return d.toISOString().split('T')[0];
} 