/**
 * Fix script to properly deactivate David's staff account
 * This will set his is_active status to false and handle any related cleanup
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixDavidStatus() {
  console.log('🔧 Fixing David\'s staff status...\n')

  try {
    // 1. Find David's record
    console.log('1. Finding David\'s staff record:')
    const { data: davids, error: findError } = await supabase
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, staff_id, is_active')
      .ilike('staff_name', '%david%')

    if (findError) {
      console.error('Error finding David:', findError)
      return
    }

    if (!davids || davids.length === 0) {
      console.log('No staff members named David found')
      return
    }

    console.log('Found David records:', davids)

    // 2. Deactivate David's account
    for (const david of davids) {
      if (david.is_active) {
        console.log(`\n2. Deactivating ${david.staff_name} (ID: ${david.id}):`)
        
        const { data: updateResult, error: updateError } = await supabase
          .schema('backoffice')
          .from('staff')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', david.id)
          .select()

        if (updateError) {
          console.error(`Error deactivating ${david.staff_name}:`, updateError)
          continue
        }

        console.log(`✅ Successfully deactivated ${david.staff_name}`)
        console.log('Updated record:', updateResult[0])

        // 3. Add notes to future schedules
        console.log(`\n3. Updating future schedules for ${david.staff_name}:`)
        const today = new Date().toISOString().split('T')[0]
        
        const { data: scheduleUpdates, error: scheduleError } = await supabase
          .schema('backoffice')
          .from('staff_schedules')
          .update({
            notes: `Staff member ${david.staff_name} deactivated - schedule may need reassignment`,
            updated_at: new Date().toISOString()
          })
          .eq('staff_id', david.id)
          .gte('schedule_date', today)
          .select('id, schedule_date, start_time, end_time')

        if (scheduleError) {
          console.error(`Error updating schedules for ${david.staff_name}:`, scheduleError)
        } else {
          console.log(`✅ Updated ${scheduleUpdates.length} future schedules`)
          if (scheduleUpdates.length > 0) {
            console.log('Updated schedules:')
            scheduleUpdates.forEach(schedule => {
              console.log(`  - ${schedule.schedule_date} ${schedule.start_time}-${schedule.end_time}`)
            })
          }
        }
      } else {
        console.log(`${david.staff_name} is already inactive`)
      }
    }

    // 4. Verify the fix
    console.log('\n4. Verifying the fix:')
    const { data: activeStaff, error: verifyError } = await supabase
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, is_active')
      .eq('is_active', true)
      .order('staff_name')

    if (verifyError) {
      console.error('Error verifying fix:', verifyError)
      return
    }

    const davidStillActive = activeStaff.find(staff => 
      staff.staff_name.toLowerCase().includes('david')
    )

    if (davidStillActive) {
      console.log('❌ David is still showing as active!')
      console.log('Active David:', davidStillActive)
    } else {
      console.log('✅ David is no longer in the active staff list')
      console.log(`Current active staff count: ${activeStaff.length}`)
    }

  } catch (error) {
    console.error('Fix script error:', error)
  }
}

// Run the fix
fixDavidStatus().then(() => {
  console.log('\n🔧 Fix complete!')
  console.log('David should no longer appear as OFF in the schedule')
  process.exit(0)
}).catch(error => {
  console.error('Script failed:', error)
  process.exit(1)
})