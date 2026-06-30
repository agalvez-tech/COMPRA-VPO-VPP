import { useState } from 'react';

// ── Constantes editables ──────────────────────────────────────────
// Límites de ingresos brutos anuales (unidad de convivencia), cifras directas
// según tabla oficial de límites por régimen.
const LIMITE_GENERAL = 54600; // Régimen General — 6,5x IPREM
const LIMITE_JOVEN = 46200; // Régimen Especial / Vivienda Joven — 5,5x IPREM

// Coeficientes correctores: se suman al límite por cada miembro que cumpla
const CORRECTOR_19_35 = 4200; // por cada miembro de 19 a 35 años
const CORRECTOR_MAYOR_65 = 1680; // por cada miembro mayor de 65 años

function RadioRow({ options, value, onChange }) {
  return (
    <div className="radio-row">
      {options.map((opt) => (
        <div
          key={opt.val}
          className={`radio-opt ${value === opt.val ? 'active' : ''}`}
          onClick={() => onChange(opt.val)}
        >
          {opt.label}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [regimen, setRegimen] = useState('general');
  const [edad, setEdad] = useState('si');
  const [nacionalidad, setNacionalidad] = useState('si');
  const [empadronado, setEmpadronado] = useState('si');
  const [anosResidencia, setAnosResidencia] = useState('1');
  const [excepcionResidencia, setExcepcionResidencia] = useState(false);
  const [viviendaPropiedad, setViviendaPropiedad] = useState('no');
  const [members, setMembers] = useState([{ nombre: '', edad: '', ingresos: '' }]);
  const [discapacidadExtra, setDiscapacidadExtra] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [resultado, setResultado] = useState(null);

  const addMember = () => setMembers([...members, { nombre: '', edad: '', ingresos: '' }]);
  const removeMember = (idx) => {
    if (members.length > 1) setMembers(members.filter((_, i) => i !== idx));
  };
  const updateMember = (idx, field, value) => {
    const copy = [...members];
    copy[idx][field] = value;
    setMembers(copy);
  };

  const regimenLabel = regimen === 'joven' ? 'Vivienda Joven (≤35 años)' : 'Régimen General';

  function calcular() {
    const checks = [];
    let allPass = true;

    const okEdad = edad === 'si';
    checks.push({
      label: 'Mayoría de edad / capacidad legal',
      pass: okEdad,
      detail: okEdad ? 'Cumple.' : 'No es mayor de edad ni menor emancipado con capacidad legal.',
    });
    allPass = allPass && okEdad;

    const okNac = nacionalidad === 'si';
    checks.push({
      label: 'Nacionalidad española o residencia legal',
      pass: okNac,
      detail: okNac ? 'Cumple.' : 'No acredita nacionalidad española ni residencia legal en España.',
    });
    allPass = allPass && okNac;

    const anos = parseFloat(anosResidencia) || 0;
    const okResidencia = empadronado === 'si' && (anos >= 1 || excepcionResidencia);
    let detalleResidencia = '';
    if (empadronado !== 'si') detalleResidencia = 'No está empadronado en la Comunitat Valenciana.';
    else if (anos < 1 && !excepcionResidencia)
      detalleResidencia = `Solo acredita ${anos} año(s) de empadronamiento (se exige 1, salvo excepción).`;
    else
      detalleResidencia = excepcionResidencia
        ? 'Cumple por excepción (violencia de género/terrorismo).'
        : 'Cumple.';
    checks.push({
      label: 'Empadronamiento en la Comunitat Valenciana',
      pass: okResidencia,
      detail: detalleResidencia,
    });
    allPass = allPass && okResidencia;

    const okVivienda = viviendaPropiedad !== 'si';
    let detalleVivienda = '';
    if (viviendaPropiedad === 'no') detalleVivienda = 'No es titular de otra vivienda. Cumple.';
    else if (viviendaPropiedad === 'si_inadecuada')
      detalleVivienda =
        'Es titular de vivienda, pero declarada inadecuada (tamaño/accesibilidad/separación). Cumple la excepción.';
    else detalleVivienda = 'Es titular de una vivienda adecuada — no cumple este requisito.';
    checks.push({ label: 'Carencia de propiedad', pass: okVivienda, detail: detalleVivienda });
    allPass = allPass && okVivienda;

    const totalIngresos = members.reduce((sum, m) => sum + (parseFloat(m.ingresos) || 0), 0);
    const baseLimite = regimen === 'joven' ? LIMITE_JOVEN : LIMITE_GENERAL;
    const corrector19_35 = members.filter((m) => {
      const e = parseFloat(m.edad);
      return e >= 19 && e <= 35;
    }).length * CORRECTOR_19_35;
    const correctorMayor65 = members.filter((m) => parseFloat(m.edad) > 65).length * CORRECTOR_MAYOR_65;
    const correctorDiscapacidad = parseFloat(discapacidadExtra) || 0;
    const limite = baseLimite + corrector19_35 + correctorMayor65 + correctorDiscapacidad;
    const okIngresos = totalIngresos <= limite && totalIngresos > 0;
    const margen = limite - totalIngresos;
    let detalleIngresos = '';
    if (totalIngresos === 0) detalleIngresos = 'No se han introducido ingresos.';
    else if (okIngresos)
      detalleIngresos = `Ingresos totales ${totalIngresos.toLocaleString('es-ES')}€ ≤ límite ${limite.toLocaleString(
        'es-ES'
      )}€ (margen de ${margen.toLocaleString('es-ES')}€).`;
    else
      detalleIngresos = `Ingresos totales ${totalIngresos.toLocaleString('es-ES')}€ superan el límite de ${limite.toLocaleString(
        'es-ES'
      )}€ por ${Math.abs(margen).toLocaleString('es-ES')}€.`;
    checks.push({ label: 'Límite de ingresos (capacidad económica)', pass: okIngresos, detail: detalleIngresos });
    allPass = allPass && okIngresos;

    setResultado({ allPass, checks, totalIngresos, limite, margen, baseLimite, corrector19_35, correctorMayor65, correctorDiscapacidad });
  }

  const cerca =
    resultado &&
    !resultado.allPass &&
    resultado.margen < 0 &&
    Math.abs(resultado.margen) <= resultado.limite * 0.05;

  const resultClass = resultado ? (resultado.allPass ? 'ok' : cerca ? 'warn' : 'no') : '';
  const resultTitle = resultado
    ? resultado.allPass
      ? '✅ Apto para VPP/VPO'
      : cerca
      ? '⚠️ No apto — muy cerca del límite'
      : '❌ No apto actualmente'
    : '';
  const resultSub = resultado
    ? resultado.allPass
      ? 'Cumple todos los requisitos comprobados. Recordad inscribir al cliente en el Registro de Demandantes de Vivienda Protegida y gestionar el visado administrativo del contrato.'
      : cerca
      ? 'Está muy cerca del límite de ingresos. Si hay discapacidad, menores a cargo, familia numerosa o algún miembro entre 35-65 años, el límite puede ampliarse — revisar caso a caso.'
      : 'No cumple uno o más requisitos. Revisa el detalle abajo.'
    : '';

  return (
    <>
      <header className="app-header">
        <div className="brand">
          RK <span>Palanca Fontestad</span>
        </div>
        <div className="sub">Calculadora interna — Elegibilidad VPP/VPO</div>
      </header>

      <div className="wrap">
        <h1>¿Es apto el cliente para VPP/VPO?</h1>
        <p className="lead">
          Rellena los datos del comprador y su unidad de convivencia para comprobar al momento si cumple los
          requisitos de acceso a vivienda de protección pública en la Comunitat Valenciana (Decreto 180/2024).
        </p>

        <div className="constants-note">
          ⚠️ Límites de ingresos: Régimen General = 54.600€/año · Vivienda Joven/Especial = 46.200€/año. Por cada
          miembro de 19 a 35 años se suman +4.200€ al límite; por cada miembro mayor de 65 años, +1.680€. El
          incremento por discapacidad/dependencia es variable y se introduce manualmente abajo. Constantes
          editables en <code>src/App.jsx</code>.
        </div>

        <div className="card">
          <h2>
            <span className="num">1</span>Tipo de vivienda protegida
          </h2>
          <label>Régimen</label>
          <RadioRow
            value={regimen}
            onChange={setRegimen}
            options={[
              { val: 'general', label: 'Régimen General' },
              { val: 'joven', label: 'Vivienda Joven (≤35 años)' },
            ]}
          />
          <p className="hint">
            El régimen joven exige que el titular (o todos los titulares) tengan 35 años o menos, y reduce el
            límite de superficie y el de ingresos.
          </p>
        </div>

        <div className="card">
          <h2>
            <span className="num">2</span>Datos personales y legales
          </h2>

          <label>Mayoría de edad / capacidad legal</label>
          <RadioRow
            value={edad}
            onChange={setEdad}
            options={[
              { val: 'si', label: 'Sí, mayor de edad' },
              { val: 'no', label: 'No' },
            ]}
          />

          <label>Nacionalidad / situación legal</label>
          <RadioRow
            value={nacionalidad}
            onChange={setNacionalidad}
            options={[
              { val: 'si', label: 'Española o residencia legal en vigor' },
              { val: 'no', label: 'Sin residencia legal' },
            ]}
          />
        </div>

        <div className="card">
          <h2>
            <span className="num">3</span>Residencia en la Comunitat Valenciana
          </h2>

          <label>¿Está empadronado en algún municipio de la Comunitat Valenciana?</label>
          <RadioRow
            value={empadronado}
            onChange={setEmpadronado}
            options={[
              { val: 'si', label: 'Sí' },
              { val: 'no', label: 'No' },
            ]}
          />

          <label>Antigüedad del empadronamiento (años)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={anosResidencia}
            onChange={(e) => setAnosResidencia(e.target.value)}
            placeholder="1"
          />
          <p className="hint">Se exige normalmente un mínimo de 1 año, salvo excepción.</p>

          <div className="checkbox-line">
            <input
              type="checkbox"
              checked={excepcionResidencia}
              onChange={(e) => setExcepcionResidencia(e.target.checked)}
            />
            <div className="txt">
              Excepción aplicable (víctima de violencia de género o de terrorismo)
              <div className="hint">Si se marca, no se exige el año de antigüedad de empadronamiento.</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>
            <span className="num">4</span>Carencia de propiedad
          </h2>
          <label>
            ¿El comprador o algún miembro de la unidad de convivencia es titular de pleno dominio o derecho real
            de uso/disfrute sobre otra vivienda en España?
          </label>
          <RadioRow
            value={viviendaPropiedad}
            onChange={setViviendaPropiedad}
            options={[
              { val: 'no', label: 'No, ninguno' },
              { val: 'si_inadecuada', label: 'Sí, pero es inadecuada' },
              { val: 'si', label: 'Sí, vivienda adecuada' },
            ]}
          />
          <p className="hint">
            Se permite igualmente si la vivienda existente es inadecuada por tamaño, falta de accesibilidad para
            persona con discapacidad, o fue adjudicada al otro cónyuge tras separación/divorcio.
          </p>
        </div>

        <div className="card">
          <h2>
            <span className="num">5</span>Unidad de convivencia e ingresos
          </h2>
          <p className="hint" style={{ marginTop: 0 }}>
            Añade a cada miembro que vivirá en la vivienda con sus ingresos (suma de base imponible general +
            base imponible del ahorro de la última declaración de la renta, o certificado de empresa/vida laboral
            en su defecto).
          </p>

          <div className="income-help">
            <button type="button" className="income-help-toggle" onClick={() => setHelpOpen(!helpOpen)}>
              ¿Dónde miro estos ingresos? <span>{helpOpen ? '▴' : '▾'}</span>
            </button>
            {helpOpen && (
              <div className="income-help-body">
                <p>
                  <strong>Si el cliente presentó declaración de la Renta (modelo 100):</strong> pídele la copia o
                  el "Detalle" de la declaración (se descarga en la Sede de la Agencia Tributaria, o se la habrá
                  guardado el gestor/asesor). Hay que sumar dos casillas:
                </p>
                <ul>
                  <li>
                    <b>Casilla 435</b> — Base imponible general (sueldo, alquileres, actividad económica, etc.)
                  </li>
                  <li>
                    <b>Casilla 460</b> — Base imponible del ahorro (intereses, dividendos, ganancias por venta de
                    acciones/fondos)
                  </li>
                </ul>
                <p>
                  Suma de ambas = ingresos a introducir para ese miembro. Si tributan conjuntamente como pareja,
                  esa suma ya cuenta como el total de los dos — no la dupliquéis.
                </p>
                <p>
                  <strong>Si no presentó declaración (no estaba obligado) o es autónomo sin declaración a mano:</strong>
                </p>
                <ul>
                  <li><b>Certificado de empresa</b> (retribuciones íntegras del año) emitido por el empleador, o</li>
                  <li>
                    <b>Informe de vida laboral + bases de cotización</b> del último año, descargable en la Sede de
                    la Seguridad Social, o
                  </li>
                  <li>
                    <b>Certificado de imputaciones de Hacienda</b>, que resume todos los ingresos declarados por
                    terceros (empresa, banco, etc.) sobre esa persona — se pide en la Sede de la Agencia Tributaria.
                  </li>
                </ul>
                <p className="income-help-note">
                  📌 Pídeles siempre el último ejercicio cerrado y presentado (normalmente el del año anterior a
                  la fecha de la consulta). Si hay pensiones, prestaciones por desempleo o ingresos no declarados
                  a integrar, súmalos también al total.
                </p>
              </div>
            )}
          </div>

          <div style={{ marginTop: 14 }}>
            {members.map((m, idx) => (
              <div className="member-row member-row-4" key={idx}>
                <div>
                  <label>Miembro {idx + 1}</label>
                  <input
                    type="text"
                    placeholder="Nombre (opcional)"
                    value={m.nombre}
                    onChange={(e) => updateMember(idx, 'nombre', e.target.value)}
                  />
                </div>
                <div>
                  <label>Edad</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={m.edad}
                    onChange={(e) => updateMember(idx, 'edad', e.target.value)}
                  />
                </div>
                <div>
                  <label>Ingresos anuales (€)</label>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={m.ingresos}
                    onChange={(e) => updateMember(idx, 'ingresos', e.target.value)}
                  />
                </div>
                <button className="remove-member" onClick={() => removeMember(idx)} title="Eliminar">
                  ×
                </button>
              </div>
            ))}
          </div>
          <button className="add-member" onClick={addMember}>
            + Añadir miembro
          </button>

          <label style={{ marginTop: 18 }}>Incremento por discapacidad o dependencia (€, opcional)</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={discapacidadExtra}
            onChange={(e) => setDiscapacidadExtra(e.target.value)}
          />
          <p className="hint">
            Si algún miembro tiene discapacidad o dependencia reconocida, el límite aumenta según el grado de
            minusvalía. Esta cuantía es variable según normativa — consultar el grado exacto y añadirla aquí
            manualmente.
          </p>
        </div>

        <button className="btn-primary" onClick={calcular}>
          Comprobar elegibilidad
        </button>

        {resultado && (
          <div style={{ marginTop: 20 }}>
            <div className={`result ${resultClass}`}>
              <p className="result-title">{resultTitle}</p>
              <p className="result-sub">{resultSub}</p>
              <ul className="check-list">
                {resultado.checks.map((c, i) => (
                  <li key={i}>
                    <div className={`check-icon ${c.pass ? 'pass' : 'fail'}`}>{c.pass ? '✓' : '✕'}</div>
                    <div className="check-text">
                      <strong>{c.label}</strong>
                      <span>{c.detail}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="income-box">
                <div className="row">
                  <span>Régimen evaluado</span>
                  <span>{regimenLabel}</span>
                </div>
                <div className="row">
                  <span>Ingresos totales unidad de convivencia</span>
                  <span>{resultado.totalIngresos.toLocaleString('es-ES')}€</span>
                </div>
                <div className="row">
                  <span>Límite base ({regimenLabel})</span>
                  <span>{resultado.baseLimite.toLocaleString('es-ES')}€</span>
                </div>
                {resultado.corrector19_35 > 0 && (
                  <div className="row">
                    <span>+ Corrector miembros 19-35 años</span>
                    <span>+{resultado.corrector19_35.toLocaleString('es-ES')}€</span>
                  </div>
                )}
                {resultado.correctorMayor65 > 0 && (
                  <div className="row">
                    <span>+ Corrector miembros mayores de 65 años</span>
                    <span>+{resultado.correctorMayor65.toLocaleString('es-ES')}€</span>
                  </div>
                )}
                {resultado.correctorDiscapacidad > 0 && (
                  <div className="row">
                    <span>+ Incremento discapacidad/dependencia</span>
                    <span>+{resultado.correctorDiscapacidad.toLocaleString('es-ES')}€</span>
                  </div>
                )}
                <div className="row">
                  <span>Límite total aplicable</span>
                  <span>{resultado.limite.toLocaleString('es-ES')}€</span>
                </div>
                <div className="row total">
                  <span>Margen</span>
                  <span style={{ color: resultado.margen >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {resultado.margen >= 0 ? '+' : ''}
                    {resultado.margen.toLocaleString('es-ES')}€
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="disclaimer">
          <b>Nota:</b> esta herramienta es una orientación interna basada en el Decreto 180/2024 del Consell. No
          sustituye la verificación oficial de requisitos por la Generalitat Valenciana (visado de contrato) ni la
          inscripción en el Registro de Demandantes de Vivienda Protegida, que sigue siendo obligatoria antes de
          firmar. Los límites de discapacidad/familia numerosa/monoparental pueden ampliar el umbral de renta —
          consultar caso a caso con Mireia/gerencia si el cliente está cerca del límite.
        </div>
      </div>
    </>
  );
}
