import Swal from 'sweetalert2';

// Configuration for consistent premium look
const swalConfig = {
    background: 'white',
    color: '#1e293b', // slate-800
    confirmButtonColor: '#3b82f6', // blue-500
    cancelButtonColor: '#64748b', // slate-500
    heightAuto: false,
    customClass: {
        popup: 'rounded-3xl border border-slate-100 shadow-2xl',
        title: 'font-kanit font-black italic uppercase italic tracking-wider',
        htmlContainer: 'font-kanit font-medium text-slate-500',
        confirmButton: 'rounded-2xl px-8 py-3 font-bold uppercase tracking-widest text-xs italic',
        cancelButton: 'rounded-2xl px-8 py-3 font-bold uppercase tracking-widest text-xs italic'
    }
};

interface Notify {
    success: (title: string, text?: string) => Promise<any>;
    error: (title: string, text?: string) => Promise<any>;
    warn: (title: string, text?: string) => Promise<any>;
    info: (title: string, text?: string) => Promise<any>;
    confirm: (title: string, text: string) => Promise<boolean>;
}

export const notify: Notify = {
    success: (title: string, text?: string) => {
        return Swal.fire({
            ...swalConfig,
            title,
            text,
            icon: 'success',
            confirmButtonColor: '#10b981', // green-500
        });
    },
    error: (title: string, text?: string) => {
        return Swal.fire({
            ...swalConfig,
            title,
            text,
            icon: 'error',
            confirmButtonColor: '#ef4444', // red-500
        });
    },
    warn: (title: string, text?: string) => {
        return Swal.fire({
            ...swalConfig,
            title,
            text,
            icon: 'warning',
            confirmButtonColor: '#f59e0b', // amber-500
        });
    },
    info: (title: string, text?: string) => {
        return Swal.fire({
            ...swalConfig,
            title,
            text,
            icon: 'info',
            confirmButtonColor: '#3b82f6', // blue-500
        });
    },
    confirm: async (title: string, text: string) => {
        const result = await Swal.fire({
            ...swalConfig,
            title,
            text,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
        });
        return result.isConfirmed;
    }
};
