import { Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ViewOnlyBannerProps {
  moduleName: string;
  description: string;
  features: string[];
}

export function ViewOnlyBanner({ moduleName, description, features }: ViewOnlyBannerProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Lock className="h-10 w-10 text-muted-foreground" />
      </div>
      
      <h1 className="text-3xl font-bold mb-3">{moduleName}</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">{description}</p>
      
      <div className="mb-8 p-6 bg-card rounded-xl border max-w-lg w-full">
        <h2 className="font-semibold mb-4 text-left">Planned Features:</h2>
        <ul className="space-y-2 text-left">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-warning/10 text-warning border border-warning/20 mb-6">
        <Lock className="h-4 w-4" />
        <span className="text-sm font-medium">This module is available in View Only mode for this demo</span>
      </div>

      <Button variant="outline" onClick={() => navigate('/dashboard')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>
    </div>
  );
}
