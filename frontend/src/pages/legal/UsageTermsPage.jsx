import LegalPageShell from "../../components/LegalPageShell";

const sections = [
  {
    title: "1. Introducción",
    paragraphs: [
      "Estos Términos de Uso regulan el acceso y uso de Volicion, una aplicación enfocada en seguimiento de hábitos, disciplina y mejora personal.",
      "Al crear una cuenta o usar la plataforma, aceptas estas condiciones. Si no estás de acuerdo, no deberías utilizar el servicio.",
    ],
  },
  {
    title: "2. Uso del servicio",
    paragraphs: [
      "Volicion ofrece herramientas para registrar hábitos, revisar métricas de progreso, consultar historial y gestionar tu perfil.",
      "El servicio puede cambiar, actualizarse o suspenderse temporalmente por razones técnicas, de seguridad o de mantenimiento.",
    ],
  },
  {
    title: "3. Responsabilidades del usuario",
    paragraphs: [
      "Debes proporcionar información veraz y mantener tus credenciales seguras.",
      "Eres responsable de la actividad que ocurra en tu cuenta y de cualquier contenido que decidas subir o registrar.",
      "No debes usar la plataforma para suplantar a otras personas, interferir con el servicio o intentar acceder a datos ajenos.",
    ],
  },
  {
    title: "4. Uso permitido",
    paragraphs: [
      "La aplicación debe utilizarse de forma razonable, respetuosa y conforme a la ley aplicable.",
      "Queda prohibido intentar vulnerar la seguridad del sistema, automatizar accesos no autorizados o realizar actividades que degraden la experiencia de otros usuarios.",
    ],
  },
  {
    title: "5. Propiedad intelectual",
    paragraphs: [
      "El diseño, código, textos, marcas y componentes visuales de Volicion pertenecen a sus respectivos titulares.",
      "No está permitido copiar, distribuir o reutilizar materiales del servicio sin autorización, salvo cuando la ley lo permita.",
    ],
  },
  {
    title: "6. Limitación de responsabilidad",
    paragraphs: [
      "Volicion se ofrece con el objetivo de apoyar hábitos y seguimiento personal, pero no garantiza resultados concretos de productividad o bienestar.",
      "No somos responsables por pérdidas indirectas, interrupciones del servicio o decisiones tomadas exclusivamente en función de la información mostrada en la plataforma.",
    ],
  },
  {
    title: "7. Cambios y contacto",
    paragraphs: [
      "Podemos actualizar estos términos para reflejar mejoras del producto o cambios legales. Cuando eso ocurra, publicaremos la versión vigente en este sitio.",
      "Si tienes dudas sobre estos términos, puedes escribir a legal@volicion.org.",
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

export default function UsageTermsPage() {
  return (
    <LegalPageShell
      title="Términos de Uso"
      description="Este documento describe las reglas básicas para usar Volicion de forma segura, ordenada y coherente con el propósito de la plataforma."
      updatedAt="17 de abril de 2026"
    >
      {sections.map((section) => (
        <Section key={section.title} {...section} />
      ))}
    </LegalPageShell>
  );
}
