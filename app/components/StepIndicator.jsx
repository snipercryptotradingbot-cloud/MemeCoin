'use client';

export default function StepIndicator({ steps, currentStep }) {
  return (
    <div className="stepper" id="step-indicator">
      {steps.map((step, i) => (
        <div key={i} className="stepper-step-wrap">
          <div
            className={`stepper-step ${
              i < currentStep ? 'completed' : i === currentStep ? 'active' : ''
            }`}
          >
            <div className="stepper-circle">
              {i < currentStep ? '✓' : i + 1}
            </div>
            <span className="stepper-label">{step}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`stepper-line ${
                i < currentStep ? 'completed' : i === currentStep ? 'active' : ''
              }`}
            />
          )}
        </div>
      ))}

      <style jsx>{`
        .stepper {
          display: flex;
          align-items: center;
          width: 100%;
        }

        .stepper-step-wrap {
          display: flex;
          align-items: center;
          flex: 1;
        }

        .stepper-step-wrap:last-child {
          flex: 0;
        }

        @media (max-width: 768px) {
          .stepper {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-1);
          }

          .stepper-step-wrap {
            flex-direction: column;
            align-items: flex-start;
          }

          .stepper-line {
            width: 2px !important;
            height: 16px !important;
            margin: var(--space-1) 0 var(--space-1) 15px !important;
          }
        }
      `}</style>
    </div>
  );
}
