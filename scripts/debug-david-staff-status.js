/**
 * Debug script to check David's staff status
 * This will help identify why David is showing as OFF when he should be filtered out
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client (you'll need to set these environment variables)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugDavidStatus() {
  console.log('🔍 Debugging David\'s staff status...\n')

  try {
    // 1. Check all staff members named David
    console.log('1. Checking all staff members named David:')
    const { data: allDavids, error: davidsError } = await supabase
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, staff_id, is_active, created_at, updated_at')
      .ilike('staff_name', '%david%')

    if (davidsError) {
      console.error('Error fetching David records:', davidsError)
      return
    }

    console.log('Found David records:', allDavids)
    console.log('')

    // 2. Check active staff members
    console.log('2. Checking all active staff members:')
    const { data: activeStaff, error: activeError } = await supabase
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, staff_id, is_active')
      .eq('is_active', true)
      .order('staff_name')

    if (activeError) {
      console.error('Error fetching active staff:', activeError)
      return
    }

    console.log('Active staff count:', activeStaff.length)
    console.log('Active staff members:')
    activeStaff.forEach(staff => {
      console.log(`  - ${staff.staff_name} (ID: ${staff.id}, Staff ID: ${staff.staff_id})`)
    })
    console.log('')

    // 3. Check if David appears in active staff
    const davidInActive = activeStaff.find(staff => 
      staff.staff_name.toLowerCase().includes('david')
    )

    if (davidInActive) {
      console.log('❌ ISSUE FOUND: David is still marked as active!')
      console.log('David details:', davidInActive)
      console.log('')
      
      // 4. Check David's recent schedules
      console.log('3. Checking David\'s recent schedules:')
      const { data: davidSchedules, error: schedulesError } = await supabase
        .schema('backoffice')
        .from('staff_schedules')
        .select('id, schedule_date, start_time, end_time, notes')
        .eq('staff_id', davidInActive.id)
        .gte('schedule_date', new Date().toISOString().split('T')[0])
        .order('schedule_date')

      if (schedulesError) {
        console.error('Error fetching David\'s schedules:', schedulesError)
      } else {
        console.log('David\'s upcoming schedules:', davidSchedules)
      }
      
    } else {
      console.log('✅ David is correctly filtered out of active staff')
    }

    // 5. Test the get_staff_schedule function
    console.log('4. Testing get_staff_schedule function:')
    const today = new Date().toISOString().split('T')[0]
    const weekEnd = new Date()
    weekEnd.setDate(weekEnd.getDate() + 7)
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    const { data: scheduleData, error: scheduleError } = await supabase
      .rpc('get_staff_schedule', {
        p_staff_id: null,
        p_start_date: today,
        p_end_date: weekEndStr
      })

    if (scheduleError) {
      console.error('Error calling get_staff_schedule:', scheduleError)
    } else {
      const davidInSchedules = scheduleData.filter(schedule => 
        schedule.staff_name.toLowerCase().includes('david')
      )
      
      if (davidInSchedules.length > 0) {
        console.log('❌ ISSUE: David appears in schedule function results!')
        console.log('David schedules:', davidInSchedules)
      } else {
        console.log('✅ David correctly filtered out of schedule function results')
      }
    }

  } catch (error) {
    console.error('Debug script error:', error)
  }
}

// Run the debug
debugDavidStatus().then(() => {
  console.log('\n🔍 Debug complete!')
  process.exit(0)
}).catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})