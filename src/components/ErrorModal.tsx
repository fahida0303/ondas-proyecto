import { MicOff, AlertCircle } from 'lucide-react';

interface ErrorModalProps {
  errorType: string | null;
  onDismiss: () => void;
}

export function ErrorModal({ errorType, onDismiss }: ErrorModalProps) {
  if (!errorType) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-icon">
          {errorType === 'NOT_FOUND' ? <AlertCircle size={56} /> : <MicOff size={56} />}
        </div>
        
        <h2 className="modal-title">
          {errorType === 'NOT_ALLOWED' ? 'Micrófono Bloqueado' : 
           errorType === 'NOT_FOUND' ? 'No hay Micrófono' : 'Error de Hardware'}
        </h2>
        
        <div className="modal-text">
          {errorType === 'NOT_ALLOWED' && (
            <p>
              El navegador no tiene permiso para usar el micrófono. 
              <br/><br/>
              <strong>Solución:</strong> Haz clic en el ícono del candado junto a la barra de direcciones de tu navegador y permite el acceso al micrófono. Luego vuelve a intentarlo.
            </p>
          )}
          {errorType === 'NOT_FOUND' && (
            <p>
              No se ha detectado ningún micrófono conectado a este dispositivo. Por favor, conecta uno o verifica la configuración de tu sistema operativo.
            </p>
          )}
          {errorType === 'UNKNOWN' && (
            <p>
              Ha ocurrido un error desconocido al intentar acceder al hardware de audio.
            </p>
          )}
        </div>

        <button className="btn btn-primary" onClick={onDismiss}>
          Entendido
        </button>
      </div>
    </div>
  );
}
