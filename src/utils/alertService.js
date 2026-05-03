import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const baseClasses = {
  popup: "rounded-[1.75rem] text-left shadow-2xl",
  title: "text-slate-900 font-black",
  htmlContainer: "text-slate-600 text-sm",
  confirmButton:
    "rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white focus:shadow-none",
  cancelButton:
    "rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 focus:shadow-none",
  actions: "gap-2"
};

function buildOptions({
  title,
  text,
  icon = "info",
  confirmText = "OK",
  cancelText = "Cancel",
  showCancel = false,
  allowOutsideClick = true,
  allowEscapeKey = true
} = {}) {
  return {
    title: title || "Notice",
    text: text || "",
    icon,
    buttonsStyling: false,
    customClass: baseClasses,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    showCancelButton: showCancel,
    reverseButtons: true,
    allowOutsideClick,
    allowEscapeKey
  };
}

export async function showAlert(options = {}) {
  return Swal.fire(buildOptions(options));
}

export async function showErrorAlert(message, options = {}) {
  return showAlert({
    title: options.title || "Something went wrong",
    text: String(message || "").trim(),
    icon: "error",
    confirmText: options.confirmText || "OK",
    allowOutsideClick: options.allowOutsideClick ?? true,
    allowEscapeKey: options.allowEscapeKey ?? true
  });
}

export async function showInfoAlert(message, options = {}) {
  return showAlert({
    title: options.title || "Notice",
    text: String(message || "").trim(),
    icon: options.icon || "info",
    confirmText: options.confirmText || "OK",
    allowOutsideClick: options.allowOutsideClick ?? true,
    allowEscapeKey: options.allowEscapeKey ?? true
  });
}

export async function showBlockingAlert(message, options = {}) {
  return showAlert({
    title: options.title || "Notice",
    text: String(message || "").trim(),
    icon: options.icon || "warning",
    confirmText: options.confirmText || "Ok, understood",
    allowOutsideClick: false,
    allowEscapeKey: false
  });
}

export async function confirmAlert(message, options = {}) {
  const result = await showAlert({
    title: options.title || "Please confirm",
    text: String(message || "").trim(),
    icon: options.icon || "warning",
    confirmText: options.confirmText || "Continue",
    cancelText: options.cancelText || "Cancel",
    showCancel: true,
    allowOutsideClick: options.allowOutsideClick ?? true,
    allowEscapeKey: options.allowEscapeKey ?? true
  });
  return Boolean(result?.isConfirmed);
}
