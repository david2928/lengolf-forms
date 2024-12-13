import { Label } from '@/components/ui/label'
import { CustomerSearch } from '../customer-search'
import { CustomerSectionProps } from '@/types/package-form'

export function CustomerSection({
  form,
  customers,
  selectedCustomerId,
  showCustomerDialog,
  searchQuery,
  onSearchQueryChange,
  onCustomerSelect,
  onDialogOpenChange
}: CustomerSectionProps) {
  const { register, formState: { errors } } = form

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">
        Customer Name
      </Label>
      <input
        type="hidden"
        {...register('customerName', { 
          required: "Customer name is required" 
        })}
      />
      <CustomerSearch 
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        showCustomerDialog={showCustomerDialog}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        onCustomerSelect={onCustomerSelect}
        onDialogOpenChange={onDialogOpenChange}
        getSelectedCustomerDisplay={() => {
          const customer = customers.find(c => c.id === selectedCustomerId)
          return customer ? customer.displayName : 'Select customer'
        }}
      />
      {errors.customerName && (
        <p className="text-red-500 text-sm mt-1">
          {errors.customerName.message as string}
        </p>
      )}
    </div>
  )
}