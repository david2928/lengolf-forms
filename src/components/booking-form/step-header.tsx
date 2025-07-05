'use client'

const STEPS = [
  { number: 1, label: 'Basic Info' },
  { number: 2, label: 'Customer Details' },
  { number: 3, label: 'Schedule' }
] as const;

export function StepHeader({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-between relative px-8">
      {STEPS.map((step) => (
        <div key={step.label} className="flex flex-col items-center relative z-10">
          <div 
            className={`w-8 h-8 rounded-full border flex items-center justify-center bg-white
              ${currentStep === step.number 
                ? 'border-dashed border-gray-600' 
                : 'border-gray-300'
              }`}
          >
            {step.number}
          </div>
          <span className={`text-sm mt-2 ${
            currentStep === step.number 
              ? 'font-semibold text-gray-900' 
              : 'text-gray-600'
          }`}>
            {step.label}
          </span>
        </div>
      ))}
      {/* Line connecting circles */}
      <div 
        className="absolute top-4 left-4 right-4 h-[1px] bg-gray-200 -z-0"
        style={{ transform: 'translateY(-50%)' }}
      />
      <div 
        className="absolute top-4 left-4 h-[1px] bg-gray-300 -z-0 transition-all duration-300"
        style={{ 
          width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
          transform: 'translateY(-50%)'
        }}
      />
    </div>
  );
}