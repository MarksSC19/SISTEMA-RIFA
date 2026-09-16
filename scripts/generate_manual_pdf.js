import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ARTIFACTS_DIR = 'C:/Users/marks/.gemini/antigravity-ide/brain/1f718895-9738-45e2-aaf6-7be8576a5f81';
const ROOT_DIR = process.cwd();

function toBase64(filePath) {
  try {
    const fileData = fs.readFileSync(filePath);
    const ext = path.extname(filePath).replace('.', '').toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
    return `data:${mime};base64,${fileData.toString('base64')}`;
  } catch (err) {
    console.warn('Could not read image:', filePath, err.message);
    return '';
  }
}

const logoB64 = toBase64(path.join(ROOT_DIR, 'public/logo.png'));
const loginB64 = toBase64(path.join(ARTIFACTS_DIR, 'login_page_1789494015739.png'));
const modalPassB64 = toBase64(path.join(ARTIFACTS_DIR, 'must_change_password_modal_1789530030632.png'));
const panelAdminB64 = toBase64(path.join(ARTIFACTS_DIR, 'panel_admin_view_1789510289304.png'));
const saleModalB64 = toBase64(path.join(ARTIFACTS_DIR, 'sale_success_modal_1789575840262.png'));
const ticketVerifyB64 = toBase64(path.join(ARTIFACTS_DIR, 'verification_ticket_0021_1789575906108.png'));

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Manual Oficial de Operador - Rifa Graduación Administración 2026</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');

    @page {
      size: A4;
      margin: 10mm 12mm 12mm 12mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0F172A;
      background-color: #FFFFFF;
      font-size: 11.5px;
      line-height: 1.5;
    }

    .page {
      page-break-after: always;
      position: relative;
      min-height: 980px;
      padding-bottom: 25px;
    }

    .page:last-child {
      page-break-after: avoid;
    }

    /* Header & Footer */
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 10px;
      border-bottom: 2px solid #E2E8F0;
      margin-bottom: 16px;
    }

    .doc-header .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .doc-header .brand img {
      width: 38px;
      height: 38px;
      object-fit: contain;
    }

    .doc-header .brand-info h1 {
      font-size: 14px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.2px;
    }

    .doc-header .brand-info p {
      font-size: 9.5px;
      color: #64748B;
      font-weight: 500;
    }

    .doc-badge {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #0F172A;
      color: #10B981;
      padding: 4px 8px;
      border-radius: 6px;
    }

    .doc-footer {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5px;
      color: #94A3B8;
      border-top: 1px solid #E2E8F0;
      padding-top: 6px;
    }

    /* Portada / Cover */
    .cover-hero {
      text-align: center;
      padding: 35px 20px 25px;
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      color: white;
      border-radius: 16px;
      margin-bottom: 20px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.2);
    }

    .cover-logo-circle {
      width: 76px;
      height: 76px;
      background: white;
      border-radius: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      margin-bottom: 14px;
      box-shadow: 0 10px 20px rgba(0,0,0,0.15);
    }

    .cover-logo-circle img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .cover-title {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin-bottom: 6px;
    }

    .cover-subtitle {
      font-size: 12.5px;
      color: #94A3B8;
      font-weight: 500;
      max-width: 500px;
      margin: 0 auto 14px;
    }

    .cover-tag {
      display: inline-block;
      background: rgba(16, 185, 129, 0.15);
      color: #34D399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    /* Steps & Sections */
    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 12px;
    }

    .step-number {
      width: 24px;
      height: 24px;
      background: #0F172A;
      color: #10B981;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .card-block {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 14px;
    }

    .card-block p {
      color: #334155;
      font-size: 10.5px;
      line-height: 1.5;
    }

    .screenshot-frame {
      border: 1.5px solid #CBD5E1;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      margin: 10px 0;
      background: #FFFFFF;
      text-align: center;
    }

    .screenshot-frame img {
      width: 100%;
      max-height: 280px;
      object-fit: contain;
      display: block;
      margin: 0 auto;
    }

    .screenshot-caption {
      background: #F1F5F9;
      padding: 5px 10px;
      font-size: 9px;
      color: #475569;
      font-weight: 600;
      border-top: 1px solid #E2E8F0;
      text-align: left;
    }

    .feature-grid {
      display: grid;
      grid-template-cols: 1fr 1fr;
      display: flex;
      gap: 10px;
      margin-bottom: 12px;
    }

    .feature-box {
      flex: 1;
      background: white;
      border: 1px solid #E2E8F0;
      padding: 9px 11px;
      border-radius: 9px;
    }

    .feature-box h4 {
      font-size: 10.5px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 3px;
    }

    .feature-box p {
      font-size: 9px;
      color: #64748B;
      line-height: 1.35;
    }

    .alert-box {
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 9.5px;
      margin: 8px 0;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .alert-info {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      color: #1E40AF;
    }

    .alert-warning {
      background: #FEF3C7;
      border: 1px solid #FDE68A;
      color: #92400E;
    }

    .alert-success {
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #065F46;
    }

    .badge-pill {
      display: inline-block;
      font-size: 9px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
    }

    .badge-green { background: #DCFCE7; color: #166534; }
    .badge-blue { background: #DBEAFE; color: #1E40AF; }

    /* Summary Table */
    table.compact-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      margin: 10px 0;
    }

    table.compact-table th {
      background: #0F172A;
      color: white;
      text-align: left;
      padding: 6px 10px;
      font-weight: 600;
    }

    table.compact-table td {
      border-bottom: 1px solid #E2E8F0;
      padding: 6px 10px;
      color: #334155;
    }

    table.compact-table tr:nth-child(even) td {
      background: #F8FAFC;
    }
  </style>
</head>
<body>

  <!-- PÁGINA 1: PORTADA Y ACCESO AL SISTEMA -->
  <div class="page">
    <div class="doc-header">
      <div class="brand">
        <img src="${logoB64}" alt="Logo Oficial">
        <div class="brand-info">
          <h1>Rifa Graduación Administración 2026</h1>
          <p>Manual Oficial del Administrador Vendedor · Región Junín</p>
        </div>
      </div>
      <div class="doc-badge">Versión Oficial 1.4</div>
    </div>

    <div class="cover-hero">
      <div class="cover-logo-circle">
        <img src="${logoB64}" alt="Logo">
      </div>
      <h2 class="cover-title">Guía Práctica para Administradores</h2>
      <p class="cover-subtitle">Aprende paso a paso a iniciar sesión con tu DNI, cambiar tu contraseña de seguridad, registrar tus ventas y emitir los comprobantes oficiales con código QR.</p>
      <div class="cover-tag">🔒 ACCESO SEGURO Y PERSONALIZADO POR DNI · CUOTA: 20 BOLETOS</div>
    </div>

    <!-- PASO 1 -->
    <div class="section-title">
      <div class="step-number">1</div>
      <span>Paso 1: Inicio de Sesión Inicial en la Plataforma</span>
    </div>

    <div class="card-block">
      <p>Cada uno de los <strong>31 administradores oficiales</strong> cuenta con una cuenta ya habilitada en la nube oficial vinculada a su número de identidad.</p>
      
      <div style="margin: 8px 0; display: flex; gap: 10px;">
        <div class="feature-box">
          <h4>👤 Usuario (Identificador)</h4>
          <p>Digita tus <strong>8 dígitos de tu número de DNI</strong> (Ej. <code>74765137</code>).</p>
        </div>
        <div class="feature-box">
          <h4>🔑 Contraseña Temporal Inicial</h4>
          <p>Para tu primer ingreso, tu clave es exactamente <strong>tu mismo número de DNI</strong>.</p>
        </div>
      </div>

      <div class="alert-box alert-info">
        <span>🌐 <strong>Enlace oficial del sistema:</strong> Puedes ingresar desde cualquier computadora, laptop o celular abriendo el navegador en: <code>https://sistema-rifa-x4xr.onrender.com/</code></span>
      </div>
    </div>

    <div class="screenshot-frame">
      <img src="${loginB64}" alt="Pantalla de Login">
      <div class="screenshot-caption">Figura 1.1: Pantalla oficial de acceso seguro por número de DNI.</div>
    </div>

    <div class="doc-footer">
      <span>Rifa Graduación Administración · Manual de Operación 2026</span>
      <span>Página 1 de 4</span>
    </div>
  </div>

  <!-- PÁGINA 2: CAMBIO DE CLAVE OBLIGATORIO Y PANEL DE CONTROL -->
  <div class="page">
    <div class="doc-header">
      <div class="brand">
        <img src="${logoB64}" alt="Logo Oficial">
        <div class="brand-info">
          <h1>Rifa Graduación Administración 2026</h1>
          <p>Manual Oficial del Administrador Vendedor · Región Junín</p>
        </div>
      </div>
      <div class="doc-badge">Seguridad y Cuota</div>
    </div>

    <!-- PASO 2 -->
    <div class="section-title">
      <div class="step-number">2</div>
      <span>Paso 2: Cambio Obligatorio de Contraseña (Primer Ingreso)</span>
    </div>

    <div class="card-block">
      <p>Por estricta política de seguridad institucional, la primera vez que ingreses con tu DNI, el sistema te solicitará sustituir tu contraseña temporal por una <strong>clave personal privada</strong> para proteger tus registros de ventas.</p>
      
      <ol style="margin-left: 18px; margin-top: 6px; font-size: 10px; color: #334155; line-height: 1.6;">
        <li><strong>Contraseña Temporal Actual:</strong> Ya viene precargada con tu número de DNI (o digita tu DNI).</li>
        <li><strong>Nueva Contraseña Personal:</strong> Escribe tu clave secreta de mínimo 6 caracteres (ej. <code>admin2026!</code>).</li>
        <li><strong>Confirmar Nueva Contraseña:</strong> Repite exactamente la misma clave y presiona <strong>"Establecer Clave y Acceder al Panel"</strong>.</li>
      </ol>

      <div class="alert-box alert-warning">
        <span>⚠️ <strong>Importante:</strong> Guarda bien tu nueva contraseña. Una vez cambiada, si intentas ingresar con tu DNI el sistema te dirá <em>"Contraseña incorrecta"</em> y solo podrás entrar con tu clave personal.</span>
      </div>
    </div>

    <div class="screenshot-frame" style="margin-bottom: 16px;">
      <img src="${modalPassB64}" alt="Modal Cambio de Clave" style="max-height: 230px;">
      <div class="screenshot-caption">Figura 2.1: Ventana de actualización obligatoria de contraseña de primer ingreso.</div>
    </div>

    <!-- PASO 3 -->
    <div class="section-title">
      <div class="step-number">3</div>
      <span>Paso 3: Conociendo tu Panel de Ventas y Talonario Asignado</span>
    </div>

    <div class="card-block">
      <p>Al acceder, verás tu panel de control personalizado con tu nombre en la esquina superior y tu <strong>talonario de 20 boletos preasignado</strong>.</p>
      
      <div style="display: flex; gap: 8px; margin-top: 6px;">
        <div class="feature-box">
          <h4>🎯 Meta Asignada</h4>
          <p><strong>20 tickets</strong> (Meta individual obligatoria: S/ 200.00 en total).</p>
        </div>
        <div class="feature-box">
          <h4>🔢 Cero Colisiones</h4>
          <p>Tus números son <strong>únicos y exclusivos</strong>. Ningún otro admin venderá tu numeración.</p>
        </div>
        <div class="feature-box">
          <h4>📊 Estado en Tiempo Real</h4>
          <p>Visualiza boletos vendidos, disponibles y dinero total recaudado al instante.</p>
        </div>
      </div>
    </div>

    <div class="screenshot-frame">
      <img src="${panelAdminB64}" alt="Panel de Administrador">
      <div class="screenshot-caption">Figura 3.1: Vista del Panel de Ventas con numeración correlativa y contador de avance.</div>
    </div>

    <div class="doc-footer">
      <span>Rifa Graduación Administración · Manual de Operación 2026</span>
      <span>Página 2 de 4</span>
    </div>
  </div>

  <!-- PÁGINA 3: REGISTRO DE VENTAS Y EMISIÓN POR WHATSAPP -->
  <div class="page">
    <div class="doc-header">
      <div class="brand">
        <img src="${logoB64}" alt="Logo Oficial">
        <div class="brand-info">
          <h1>Rifa Graduación Administración 2026</h1>
          <p>Manual Oficial del Administrador Vendedor · Región Junín</p>
        </div>
      </div>
      <div class="doc-badge">Emisión de Tickets</div>
    </div>

    <!-- PASO 4 -->
    <div class="section-title">
      <div class="step-number">4</div>
      <span>Paso 4: Cómo Registrar una Venta de Tickets</span>
    </div>

    <div class="card-block">
      <p>Para emitir un ticket cuando un familiar, amigo o comprador te abone los <strong>S/ 10.00</strong>:</p>
      <ol style="margin-left: 18px; margin-top: 6px; font-size: 10px; color: #334155; line-height: 1.6;">
        <li>Presiona el botón negro <strong>"+ Registrar Venta"</strong> en la cabecera de tu panel.</li>
        <li><strong>Venta Múltiple:</strong> Puedes seleccionar cuántos tickets compra (1, 2, 3 o más). El sistema tomará correlativamente tus números disponibles.</li>
        <li><strong>Datos del Comprador:</strong> Ingresa su Nombre Completo, Teléfono Celular (WhatsApp) y DNI.</li>
        <li><strong>Método de Pago:</strong> Selecciona Yape, Plin, Efectivo o Transferencia.</li>
        <li>Haz clic en <strong>"Confirmar Venta y Generar Ticket"</strong>.</li>
      </ol>
    </div>

    <!-- PASO 5 -->
    <div class="section-title">
      <div class="step-number">5</div>
      <span>Paso 5: Envío del Comprobante Digital con Código QR por WhatsApp</span>
    </div>

    <div class="card-block">
      <p>Una vez registrada la venta, aparecerá inmediatamente el <strong>Comprobante Digital Oficial</strong> con su Código QR de alta resolución y el botón verde de WhatsApp:</p>

      <div style="display: flex; gap: 10px; margin: 8px 0;">
        <div class="feature-box">
          <h4>📲 Botón "Enviar Comprobante por WhatsApp"</h4>
          <p>Abre directamente el chat del comprador con un mensaje formal prediseñado con el número de boleto, hora exacta y enlace oficial.</p>
        </div>
        <div class="feature-box">
          <h4>📥 Descargar Imagen QR</h4>
          <p>Puedes descargar la imagen del comprobante o el código QR para adjuntarla como foto en WhatsApp si lo prefieres.</p>
        </div>
      </div>

      <div class="alert-box alert-success">
        <span>✅ <strong>Mensaje automático generado:</strong><br>
        <em>"🎟️ RIFAS OFICIAL - Tu Ticket ha sido emitido con éxito!<br>
        📌 Rifa: Gran Rifa 2026 (#024) | 🔢 Número: #0001 | 👤 Titular: ... | 💰 S/ 10.00<br>
        🌐 Verifica tu ticket en línea: https://sistema-rifa-x4xr.onrender.com/?verify=TK-..."</em></span>
      </div>
    </div>

    <div class="screenshot-frame">
      <img src="${saleModalB64}" alt="Modal Venta Exitosa">
      <div class="screenshot-caption">Figura 5.1: Modal de Venta Exitosa con Código QR y botón de envío directo por WhatsApp.</div>
    </div>

    <div class="doc-footer">
      <span>Rifa Graduación Administración · Manual de Operación 2026</span>
      <span>Página 3 de 4</span>
    </div>
  </div>

  <!-- PÁGINA 4: VERIFICACIÓN PÚBLICA, PREMIOS Y REGLAMENTO -->
  <div class="page">
    <div class="doc-header">
      <div class="brand">
        <img src="${logoB64}" alt="Logo Oficial">
        <div class="brand-info">
          <h1>Rifa Graduación Administración 2026</h1>
          <p>Manual Oficial del Administrador Vendedor · Región Junín</p>
        </div>
      </div>
      <div class="doc-badge">Verificación y Premios</div>
    </div>

    <!-- PASO 6 -->
    <div class="section-title">
      <div class="step-number">6</div>
      <span>Paso 6: Lo que ve el Participante (Verificación Pública y Premios)</span>
    </div>

    <div class="card-block">
      <p>Cuando el participante hace clic en el enlace de WhatsApp o escanea el Código QR con la cámara de su teléfono:</p>
      <ul style="margin-left: 18px; margin-top: 6px; font-size: 10px; color: #334155; line-height: 1.5;">
        <li><strong>Acceso 100% Público:</strong> No le pide contraseña ni usuario.</li>
        <li><strong>Certificado Oficial:</strong> Visualiza su número de boleto con sello verde de "VERIFICADO", su nombre, DNI y fecha de registro.</li>
        <li><strong>Vitrina Oficial de los 7 Premios:</strong> En la misma página, el comprador puede revisar los 7 grandes premios con sus fotos y enlaces oficiales (Microondas LG, Tatuajes Black Monkey, Tarima, etc.).</li>
      </ul>
    </div>

    <div class="screenshot-frame" style="margin-bottom: 14px;">
      <img src="${ticketVerifyB64}" alt="Ticket Verificado con Premios" style="max-height: 240px;">
      <div class="screenshot-caption">Figura 6.1: Certificado digital verificado y galería visual de los 7 grandes premios.</div>
    </div>

    <!-- RESUMEN DE SEGURIDAD -->
    <div class="section-title" style="margin-top: 10px;">
      <div class="step-number">7</div>
      <span>Resumen Rápido y Preguntas Frecuentes</span>
    </div>

    <table class="compact-table">
      <thead>
        <tr>
          <th>Situación</th>
          <th>¿Qué debo hacer?</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>¿Olvidé mi contraseña personal?</strong></td>
          <td>Comunícate con el Superadministrador Oficial (Jheyson Ryam Jorge Vasquez) para restablecer tu acceso.</td>
        </tr>
        <tr>
          <td><strong>¿Un cliente me compró 3 tickets?</strong></td>
          <td>En el formulario selecciona "3 tickets". El sistema emitirá 3 números correlativos a su nombre con un solo clic.</td>
        </tr>
        <tr>
          <td><strong>¿El cliente no tiene lector de QR?</strong></td>
          <td>No hay problema, el link de WhatsApp abre el certificado directamente en Chrome o Safari de su celular.</td>
        </tr>
        <tr>
          <td><strong>¿Ya completé mis 20 boletos?</strong></td>
          <td>Tu panel indicará 100% cumplido (S/ 200.00 recaudados) y se reflejará en el consolidado del Superadmin.</td>
        </tr>
      </tbody>
    </table>

    <div style="background: #0F172A; color: white; padding: 10px 14px; border-radius: 10px; text-align: center; margin-top: 10px;">
      <p style="font-size: 10px; font-weight: 700; color: #10B981;">¡Muchos éxitos a los 31 Administradores en la Gran Rifa de Graduación 2026!</p>
      <p style="font-size: 8.5px; color: #94A3B8; margin-top: 2px;">Sistema desarrollado con tecnología segura PostgreSQL · Región Junín</p>
    </div>

    <div class="doc-footer">
      <span>Rifa Graduación Administración · Manual de Operación 2026</span>
      <span>Página 4 de 4</span>
    </div>
  </div>

</body>
</html>
`;

const outputPathHtml = path.join(ROOT_DIR, 'Manual_Guia_Administradores_Rifa_2026.html');
const outputPathPdf = path.join(ROOT_DIR, 'Manual_Guia_Administradores_Rifa_2026.pdf');

fs.writeFileSync(outputPathHtml, htmlContent, 'utf8');
console.log('✓ Archivo HTML autovalidado generado en:', outputPathHtml);

// Convertir a PDF utilizando Google Chrome o Microsoft Edge en modo headless
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browserExe = fs.existsSync(chromePath) ? chromePath : edgePath;

console.log('Imprimiendo PDF con:', browserExe);
try {
  execSync(`"${browserExe}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${outputPathPdf}" "${outputPathHtml}"`);
  console.log('🎉 PDF GENERADO EXITOSAMENTE EN:', outputPathPdf);
} catch (err) {
  console.error('Error al generar PDF con Chrome:', err.message);
}
