'use client';

import { useState } from 'react';

interface ToastMessage {
    id: number;
    type: 'success' | 'error';
    message: string;
}

let toastId = 0;
let addToastFn: ((type: 'success' | 'error', message: string) => void) | null = null;

export function showToast(type: 'success' | 'error', message: string) {
    if (addToastFn) addToastFn(type, message);
}

export default function ToastContainer() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    addToastFn = (type: 'success' | 'error', message: string) => {
        const id = ++toastId;
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    };

    return (
        <div className="toast-container">
            {toasts.map((t) => (
                <div key={t.id} className={`toast toast-${t.type}`}>
                    {t.type === 'success' ? '✓' : '✗'} {t.message}
                </div>
            ))}
        </div>
    );
}
