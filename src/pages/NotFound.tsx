import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-6 text-center">
      <div className="space-y-6 max-w-md">
        <div className="space-y-3">
          <h1 className="text-8xl font-bold text-blue-600">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800">Page introuvable</h2>
          <p className="text-muted-foreground">La page que vous recherchez n'existe pas ou a peut-être été déplacée.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <a href="/">Retour à l'accueil</a>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Revenir en arrière
          </Button>
        </div>
      </div>
    </div>
  );
}
