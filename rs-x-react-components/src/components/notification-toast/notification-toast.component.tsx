'use client';

import React, { useEffect, useRef } from 'react';

import './notification-toast.component.css';

export type NotificationToastVariant = 'success' | 'error' | 'info';

export interface INotificationToastProps {
  open: boolean;
  title?: string;
  message: string;
  variant?: NotificationToastVariant;
  durationMs?: number;
  onClose: () => void;
}

export const NotificationToast: React.FC<INotificationToastProps> = ({
  open,
  title,
  message,
  variant = 'info',
  durationMs = 3200,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const id = window.setTimeout(() => {
      onClose();
    }, durationMs);

    return () => {
      window.clearTimeout(id);
    };
  }, [open, durationMs, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (!ref.current?.contains(target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="notificationToastHost">
      <div ref={ref} className={`notificationToast notificationToast--${variant}`} role="status" aria-live="polite">
        {title ? <div className="notificationToastTitle">{title}</div> : null}
        <div className="notificationToastMessage">{message}</div>
      </div>
    </div>
  );
};
