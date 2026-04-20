import LegalPageShell from "../../components/LegalPageShell";

const sections = [
  {
    title: "1. Introducción",
    paragraphs: [
      "Esta Política de Cookies explica cómo usa VOLICION tecnologías similares para que la experiencia funcione correctamente, sea segura y se pueda recordar tu sesión.",
      "Las cookies y almacenamiento local nos ayudan a conservar preferencias y a mantener funciones básicas del sitio.",
    ],
  },
  {
    title: "2. Qué tipos de cookies usamos",
    paragraphs: [
      "Usamos cookies o tecnologías equivalentes de sesión, autenticación, preferencias y análisis básico del funcionamiento.",
      "Algunas son necesarias para que el sitio opere; otras son opcionales y dependen de la configuración del navegador o del consentimiento que aplique.",
    ],
  },
  {
    title: "3. Para qué sirven",
    paragraphs: [
      "Las cookies necesarias permiten iniciar sesión, mantener tu sesión activa, recordar la interfaz y proteger ciertas acciones del usuario.",
      "Las cookies de preferencias pueden recordar el tema visual u otros ajustes que mejoran tu experiencia.",
    ],
  },
  {
    title: "4. Cookies de terceros",
    paragraphs: [
      "Podemos usar servicios de infraestructura o análisis que a su vez establezcan cookies o identificadores técnicos limitados para operar correctamente.",
      "Si incorporamos herramientas adicionales en el futuro, actualizaremos esta política para reflejarlo de forma clara.",
    ],
  },
  {
    title: "5. Cómo administrarlas",
    paragraphs: [
      "Puedes configurar tu navegador para bloquear, eliminar o limitar cookies. Si lo haces, algunas funciones podrían dejar de funcionar como esperas.",
      "También puedes borrar el almacenamiento local desde el navegador si deseas restablecer preferencias guardadas.",
    ],
  },
  {
    title: "6. Cambios",
    paragraphs: [
      "Podemos actualizar esta política si cambia la tecnología usada por la plataforma o si se agregan nuevas funciones.",
      "La versión vigente siempre será la publicada en este sitio.",
    ],
  },
];

function Section({ title, paragraphs }) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm sm:text-base leading-7 text-slate-600 dark:text-slate-300">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

export default function BrowserStoragePage() {
  return (
    <LegalPageShell
      title="Política de Cookies"
      description="Esta página resume el uso de cookies y tecnologías similares para mantener la sesión, las preferencias y el funcionamiento normal de VOLICION."
      updatedAt="17 de abril de 2026"
    >
      {sections.map((section) => (
        <Section key={section.title} {...section} />
      ))}
    </LegalPageShell>
  );
}
