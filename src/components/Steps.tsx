import { cn } from "@/lib/utils";

interface Step {
  title: string;
  description: string;
}

interface StepsProps {
  steps: Step[];
  currentStep: number;
}

export function Steps({ steps, currentStep }: StepsProps) {
  return (
    <div className="relative">
      {/* Progress bar background */}
      <div className="absolute top-4 left-0 w-full h-0.5 bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ 
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </div>

      {/* Steps */}
      <div className="relative flex justify-between">
        {steps.map((step, index) => (
          <div 
            key={step.title}
            className={cn(
              "flex flex-col items-center",
              index + 1 <= currentStep ? "text-primary" : "text-muted-foreground"
            )}
          >
            {/* Step circle */}
            <div 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center mb-2 border-2 transition-colors duration-300",
                index + 1 <= currentStep 
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground bg-background"
              )}
            >
              <span className="text-sm font-medium">
                {index + 1}
              </span>
            </div>

            {/* Step text */}
            <div className="space-y-1 text-center">
              <div className="text-sm font-medium">
                {step.title}
              </div>
              <div className="text-xs text-muted-foreground w-32">
                {step.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 