import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { EmployeeSectionProps, EMPLOYEES } from '@/types/package-form'

export function EmployeeSection({ form }: EmployeeSectionProps) {
  const { register, setValue, trigger, formState: { errors }, watch } = form

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        Employee Name
      </Label>
      <input
        type="hidden"
        {...register('employeeName', { 
          required: "Employee name is required" 
        })}
      />
      <RadioGroup
        onValueChange={(value) => {
          setValue('employeeName', value)
          trigger('employeeName')
        }}
        className="grid grid-cols-2 gap-4"
        value={watch('employeeName')}
      >
        {EMPLOYEES.map((employee) => (
          <div key={employee} className="flex items-center space-x-2">
            <RadioGroupItem value={employee} id={employee} />
            <Label htmlFor={employee} className="font-normal">
              {employee}
            </Label>
          </div>
        ))}
      </RadioGroup>
      {errors.employeeName && (
        <p className="text-red-500 text-sm mt-1">
          {errors.employeeName.message as string}
        </p>
      )}
    </div>
  )
}