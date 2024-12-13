import { usePackageForm } from '@/hooks/usePackageForm'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { ConfirmationDialog } from './confirmation-dialog'
import { EmployeeSection } from './form-sections/employee-section'
import { CustomerSection } from './form-sections/customer-section'
import { PackageTypeSection } from './form-sections/package-type-section'
import { DatesSection } from './form-sections/dates-section'

export default function PackageForm() {
  const { 
    form, 
    state, 
    updateState, 
    handleCustomerSelect, 
    handleSubmit, 
    confirmSubmit 
  } = usePackageForm()

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-4 animate-spin text-[#005a32]" />
        <span className="ml-2">Loading data...</span>
      </div>
    )
  }

  return (
    <div className="container max-w-lg mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-[#005a32] mb-8 text-center">
        LENGOLF Package Creation
      </h1>
      
      {state.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-400 text-red-700 rounded-lg">
          <p>{state.error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <EmployeeSection form={form} />

        <CustomerSection 
          form={form}
          customers={state.customers}
          selectedCustomerId={state.selectedCustomerId}
          showCustomerDialog={state.showCustomerDialog}
          searchQuery={state.searchQuery}
          onSearchQueryChange={(query) => updateState({ searchQuery: query })}
          onCustomerSelect={handleCustomerSelect}
          onDialogOpenChange={(open) => updateState({ showCustomerDialog: open })}
        />

        <PackageTypeSection 
          form={form}
          packageTypes={state.packageTypes}
        />

        <DatesSection 
          form={form}
          selectedDates={state.selectedDates}
          onDatesChange={(dates) => updateState({ 
            selectedDates: { ...state.selectedDates, ...dates }
          })}
        />

        <Button 
          type="submit" 
          className="w-full bg-[#005a32] text-white hover:bg-[#004a29] transition-colors"
          disabled={state.isLoading}
        >
          {state.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Package'
          )}
        </Button>
      </form>

      <ConfirmationDialog
        open={state.showConfirmation}
        onOpenChange={(open) => updateState({ showConfirmation: open })}
        formData={state.formData}
        onConfirm={confirmSubmit}
        getPackageTypeName={(id) => 
          state.packageTypes.find(type => type.id === id)?.name || ''
        }
      />
    </div>
  )
}