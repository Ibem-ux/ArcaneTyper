export class MagicalToast {
    static init() {
        this.toastContainer = document.getElementById('toast-container');

        // Add Esc listener to dismiss toasts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearAll();
            }
        });
    }

    static show(message, duration = 4000) {
        if (!this.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = 'magical-toast';
        toast.innerHTML = message;

        this.toastContainer.appendChild(toast);

        // Auto-remove after duration
        setTimeout(() => {
            toast.classList.add('fade-out');
            // Remove from DOM after transition finishes
            setTimeout(() => {
                if (this.toastContainer && this.toastContainer.contains(toast)) {
                    this.toastContainer.removeChild(toast);
                }
            }, 500);
        }, duration);
    }

    static clearAll() {
        if (!this.toastContainer) return;
        const toasts = this.toastContainer.querySelectorAll('.magical-toast');
        toasts.forEach(toast => {
            toast.classList.add('fade-out');
            setTimeout(() => {
                if (this.toastContainer && this.toastContainer.contains(toast)) {
                    this.toastContainer.removeChild(toast);
                }
            }, 500);
        });
    }
}
