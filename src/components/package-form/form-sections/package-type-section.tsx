import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PackageTypeSectionProps } from '@/types/package-form'

export function PackageTypeSection({ form, packageTypes }: PackageTypeSectionProps) {
  const { register, setValue, trigger, formState: { errors } } = form

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        Package Type
      </Label>
      <input
        type="hidden"
        {...register('packageTypeId', { 
          required: "Package type is required" 
        })}
      />
      <Select
        onValueChange={(value) => {
          setValue('packageTypeId', parseInt(value))
          trigger('packageTypeId')
        }}
      >
        <SelectTrigger className="w-full px-3 py-2 border border-gray-200 focus:border-[#005a32] focus:outline-none focus:ring-1 focus:ring-[#005a32] hover:border-gray-300 transition-colors bg-white data-[placeholder]:text-gray-500">
          <SelectValue placeholder="Select package type" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200">
          {packageTypes.map((type) => (
            <SelectItem
              key={type.id}
              value={type.id.toString()}
              className="cursor-pointer hover:bg-gray-100 focus:bg-gray-100 outline-none"
            >
              {type.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors.packageTypeId && (
        <p className="text-red-500 text-sm mt-1">
          {errors.packageTypeId.message as string}
        </p>
      )}
    </div>
  )
}