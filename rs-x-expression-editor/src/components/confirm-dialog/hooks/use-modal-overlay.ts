import { useEffect } from 'react';

export function useModalOverlay(args: {
    isOpen: boolean;
    onCancel: () => void;
    onConfirm?: () => void;
}) {
    const { isOpen, onCancel, onConfirm } = args;

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onCancel();
                return;
            }

            if (e.key === 'Enter' && onConfirm) {
                e.preventDefault();
                onConfirm();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Lock body scroll
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, onCancel, onConfirm]);
}