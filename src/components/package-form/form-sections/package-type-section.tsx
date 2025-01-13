import { Label } from '@/components/ui/label'
import { PackageTypeSearch } from '@/components/package-form/package-type-search'
import { useState } from 'react'
import { PackageTypeSectionProps } from '@/types/package-form'

export function PackageTypeSection({ form, packageTypes }: PackageTypeSectionProps) {
  const { register, setValue, trigger, formState: { errors }, watch } = form
  const [showDialog, setShowDialog] = useState(false)

  const selectedTypeId = watch('packageTypeId')

  const handlePackageSelect = (packageType: { id: number, name: string }) => {
    setValue('packageTypeId', packageType.id)
    trigger('packageTypeId')
  }

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
      <PackageTypeSearch
        packageTypes={packageTypes}
        selectedTypeId={selectedTypeId}
        showDialog={showDialog}
        onPackageSelect={handlePackageSelect}
        onDialogOpenChange={setShowDialog}
      />
      {errors.packageTypeId && (
        <p className="text-red-500 text-sm mt-1">
          {errors.packageTypeId.message as string}
        </p>
      )}
    </div>
  )
}