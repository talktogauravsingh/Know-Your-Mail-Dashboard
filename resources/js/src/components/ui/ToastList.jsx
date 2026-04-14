import { useStore } from '../../store/useStore';
import { X } from 'lucide-react';

export function ToastList() {
  const toasts = useStore((state) => state.toasts);
  const removeToast = useStore((state) => state.removeToast);

  return (
    <div className="fixed right-4 top-20 flex flex-col gap-2 z-[1000] max-w-md">
      {toasts.map(({ id, message, type }) => (
        <div 
          key={id} 
          className={`p-4 rounded-xl shadow-xl border animate-in slide-in-from-right fade-in duration-300 max-w-md text-sm leading-tight ${
            type === 'error' ? 'bg-red-500 text-white border-red-300' : 
            type === 'success' ? 'bg-green-500 text-white border-green-300' :
            'bg-blue-500 text-white border-blue-300'
          }`}
        >
          {message}
          <button
            className="ml-auto p-1 hover:bg-opacity-80 rounded-full transition-all hover:scale-110 opacity-80 hover:opacity-100"
            onClick={() => removeToast(id)}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

