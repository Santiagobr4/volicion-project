import LegalPageShell from "../../components/LegalPageShell";

const sections = [
  {
    title: "1. Introducción",
    paragraphs: [
      "Esta Política de Privacidad explica qué datos recopilamos, cómo los usamos y cuáles son tus derechos como usuario de VOLICION.",
      "Nuestro objetivo es manejar la información con el menor nivel de fricción posible y solo para operar, proteger y mejorar el servicio.",
    ],
  },
  {
    title: "2. Datos que recopilamos",
    paragraphs: [
      "Podemos recopilar datos que proporcionas directamente al crear tu cuenta, editar tu perfil o registrar hábitos, como nombre, correo electrónico, foto de perfil y métricas de progreso.",
      "También podemos recopilar datos técnicos básicos, como dirección IP, tipo de navegador, idioma, fechas de acceso y eventos de uso necesarios para seguridad y diagnóstico.",
    ],
  },
  {
    title: "3. Cómo usamos la información",
    paragraphs: [
      "Usamos tus datos para crear y administrar tu cuenta, guardar tus hábitos, mostrar tu historial y calcular métricas de avance.",
      "También podemos usarlos para enviar mensajes operativos, prevenir abuso, corregir errores y mejorar la experiencia del producto.",
    ],
  },
  {
    title: "4. Base de tratamiento y conservación",
    paragraphs: [
      "Tratamos la información con base en tu consentimiento, la ejecución del servicio solicitado y nuestro interés legítimo en mantener la plataforma segura y funcional.",
      "Conservamos los datos durante el tiempo necesario para prestar el servicio o cumplir obligaciones legales. Si eliminas tu cuenta, podremos retener cierta información durante un periodo limitado por motivos técnicos, legales o de seguridad.",
    ],
  },
  {
    title: "5. Compartición de datos",
    paragraphs: [
      "No vendemos tu información personal. Podemos compartir datos con proveedores de infraestructura que nos ayudan a operar la aplicación, siempre con medidas de seguridad razonables.",
      "Si una ley, autoridad competente o proceso legal lo exige, también podremos divulgar información de forma limitada y justificada.",
    ],
  },
  {
    title: "6. Tus derechos",
    paragraphs: [
      "Puedes solicitar acceso, corrección o eliminación de ciertos datos, así como oponerte a determinados usos cuando la normativa aplicable lo permita.",
      "Si quieres ejercer tus derechos o entender cómo manejamos tus datos, puedes escribir a privacy@volicion.org.",
    ],
  },
  {
    title: "7. Seguridad",
    paragraphs: [
      "Aplicamos medidas razonables para proteger tu información, pero ningún sistema es completamente invulnerable.",
      "Te recomendamos usar una contraseña fuerte, mantener tu dispositivo protegido y cerrar sesión en equipos compartidos.",
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

export default function DataPolicyPage() {
  return (
    <LegalPageShell
      title="Política de Privacidad"
      description="Aquí se resume cómo tratamos los datos de la cuenta, el uso de la aplicación y la información técnica necesaria para operar VOLICION."
      updatedAt="17 de abril de 2026"
    >
      {sections.map((section) => (
        <Section key={section.title} {...section} />
      ))}
    </LegalPageShell>
  );
}
