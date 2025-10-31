const SOAP_URL = "http://localhost:9091/ws";
const USER = "admin";
const PASS = "admin123";
// REST API base (controller Spring que enviaste)
const REST_BASE = "http://localhost:8080/api/articulos";

// Construcción de mensajes SOAP
function crearSoapInsertar(data) {
  return `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                    xmlns:art="http://www.example.com/soap/articulos">
    <soapenv:Header/>
    <soapenv:Body>
      <art:InsertarArticuloRequest>
        <art:articulo>
          <art:codigo>${escapeXml(data.codigo)}</art:codigo>
          <art:nombre>${escapeXml(data.nombre)}</art:nombre>
          <art:categoria>${escapeXml(data.categoria)}</art:categoria>
          <art:precioCompra>${escapeXml(data.precioCompra)}</art:precioCompra>
          <art:precioVenta>${escapeXml(data.precioVenta)}</art:precioVenta>
          <art:stock>${escapeXml(data.stock)}</art:stock>
          <art:stockMinimo>${escapeXml(data.stockMinimo)}</art:stockMinimo>
          <art:proveedor>${escapeXml(data.proveedor)}</art:proveedor>
        </art:articulo>
      </art:InsertarArticuloRequest>
    </soapenv:Body>
  </soapenv:Envelope>`;
}

function crearSoapConsulta(codigo) {
  return `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                    xmlns:art="http://www.example.com/soap/articulos">
    <soapenv:Header/>
    <soapenv:Body>
      <art:ConsultarArticuloRequest>
        <art:codigo>${escapeXml(codigo)}</art:codigo>
      </art:ConsultarArticuloRequest>
    </soapenv:Body>
  </soapenv:Envelope>`;
}

function escapeXml(unsafe) {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Parsear respuesta SOAP a DOM
function parseXml(text) {
  try {
    return new DOMParser().parseFromString(text, 'application/xml');
  } catch (e) {
    return null;
  }
}

function findFirst(node, localName) {
  if (!node) return null;
  const list = node.getElementsByTagName('*');
  for (let i = 0; i < list.length; i++) {
    if (list[i].localName === localName) return list[i];
  }
  return null;
}

function extractFieldsFromArticulo(artNode) {
  const fields = {};
  if (!artNode) return fields;
  for (let i = 0; i < artNode.children.length; i++) {
    const ch = artNode.children[i];
    fields[ch.localName || ch.nodeName] = ch.textContent || '';
  }
  return fields;
}

function renderTable(fields) {
  const rows = Object.keys(fields).map(k => `
    <tr>
      <th>${escapeHtml(k)}</th>
      <td>${escapeHtml(fields[k])}</td>
    </tr>`).join('');
  return `<table class="result-table"><tbody>${rows}</tbody></table>`;
}

function escapeHtml(s) {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function setStatusBadge(status, text) {
  const el = document.getElementById('result-status');
  if (!el) return;
  el.className = 'badge ' + (status === 'success' ? 'success' : status === 'error' ? 'error' : 'neutral');
  el.textContent = text;
}

function setTimestamp() {
  const el = document.getElementById('result-time');
  if (!el) return;
  el.textContent = new Date().toLocaleString();
}

function renderResult({type, status, message, fields, raw}) {
  const body = document.getElementById('result-body');
  const rawEl = document.getElementById('rawXml');
  if (!body) return;
  setStatusBadge(status, status === 'success' ? 'OK' : status === 'error' ? 'Error' : 'Info');
  setTimestamp();
  rawEl.textContent = raw || '';

  if (status === 'error') {
    body.innerHTML = `<div class="message error">${escapeHtml(message || 'Error en la operación.')}</div>`;
    return;
  }

  if (fields && Object.keys(fields).length > 0) {
    body.innerHTML = `
      <div class="message ${status}">${escapeHtml(message || '')}</div>
      ${renderTable(fields)}
    `;
  } else {
    body.innerHTML = `<div class="message info">${escapeHtml(message || 'Operación completada.')}</div>`;
  }
}

// Toggle de XML crudo
document.addEventListener('click', e => {
  const t = e.target;
  if (t && t.id === 'toggleRaw') {
    const rawEl = document.getElementById('rawXml');
    if (!rawEl) return;
    const visible = rawEl.style.display !== 'none';
    rawEl.style.display = visible ? 'none' : 'block';
    t.textContent = visible ? 'Ver XML crudo' : 'Ocultar XML crudo';
  }
});

// --- Navegación entre secciones (menu bar) ---
function showSection(id) {
  document.querySelectorAll('section[id^="section-"]').forEach(s => s.classList.add('hidden'));
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
  document.querySelectorAll('.menu-item').forEach(b => {
    b.classList.toggle('active', b.dataset.target === id);
  });
}

document.querySelectorAll('.menu-item').forEach(btn => {
  btn.addEventListener('click', () => showSection(btn.dataset.target));
});

// Delegación: manejar click en botones "Actualizar" dentro del listado
document.addEventListener('click', e => {
  const btn = e.target.closest && e.target.closest('.btn-update');
  if (!btn) return;
  const codigo = btn.dataset.codigo;
  if (!codigo) return;
  // traer datos REST para prellenar el formulario
  fetch(`${REST_BASE}/${encodeURIComponent(codigo)}`)
    .then(r => {
      if (!r.ok) throw new Error(`Error ${r.status}`);
      return r.json();
    })
    .then(json => {
      // Mapear campos comunes a inputs de actualizar
      document.getElementById('updCodigo').value = json.codigo || json.codigoArticulo || codigo || '';
      document.getElementById('updNombre').value = json.nombre || '';
      document.getElementById('updCategoria').value = json.categoria || '';
      document.getElementById('updPrecioCompra').value = json.precioCompra || '';
      document.getElementById('updPrecioVenta').value = json.precioVenta || '';
      document.getElementById('updStock').value = json.stock || '';
      document.getElementById('updStockMinimo').value = json.stockMinimo || '';
      document.getElementById('updProveedor').value = json.proveedor || '';
      showSection('section-actualizar');
    })
    .catch(err => renderResult({status: 'error', message: err.message}));
});

// --- Funciones REST: Listar y Actualizar ---
async function listArticulos() {
  setStatusBadge('neutral', 'Listando...');
  setTimestamp();
  try {
    const resp = await fetch(REST_BASE, { method: 'GET' });
    if (!resp.ok) {
      const txt = await resp.text();
      renderResult({status: 'error', message: `Error ${resp.status}`, raw: txt});
      return;
    }
    const data = await resp.json();
    // data expected to be array of articulos
    renderList(data);
    setStatusBadge('success', 'OK');
    document.getElementById('rawXml').textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    renderResult({status: 'error', message: err.message, raw: ''});
  }
}

function renderList(items) {
  const body = document.getElementById('result-body');
  if (!Array.isArray(items) || items.length === 0) {
    body.innerHTML = `<div class="message info">No hay artículos para mostrar.</div>`;
    return;
  }

  const cols = Object.keys(items[0]);
  const codeKey = cols.find(c => c.toLowerCase().includes('codigo')) || cols[0];

  const thead = `<thead><tr>${cols.map(c => `<th>${escapeHtml(c)}</th>`).join('')}<th>Acciones</th></tr></thead>`;

  const rows = items.map(it => {
    const stock = Number(it.stock);
    const minimo = Number(it.stockMinimo);
    const lowStock = stock < minimo;
    const stockCell = `<td class="${lowStock ? 'low-stock' : ''}">${escapeHtml(it.stock)}</td>`;

    const rowCells = cols.map(c => {
      if (c === 'stock') return stockCell;
      return `<td>${escapeHtml(it[c])}</td>`;
    }).join('');

    const alertIcon = lowStock ? '⚠️' : '';
    return `<tr>${rowCells}<td><button class="btn-update" data-codigo="${escapeHtml(it[codeKey])}">Actualizar</button> ${alertIcon}</td></tr>`;
  }).join('');

  body.innerHTML = `
    <div class="message info">Mostrando ${items.length} artículo(s)</div>
    <div class="table-wrap">
      <table class="result-table">${thead}<tbody>${rows}</tbody></table>
    </div>
  `;
}


// Actualizar articulo (PUT /api/articulos/{codigo})
document.getElementById('formActualizar').addEventListener('submit', async e => {
  e.preventDefault();
  const codigo = document.getElementById('updCodigo').value;
  if (!codigo) {
    renderResult({status: 'error', message: 'Código requerido para actualizar.'});
    return;
  }
  const payload = {
    nombre: document.getElementById('updNombre').value,
    categoria: document.getElementById('updCategoria').value,
    precioCompra: document.getElementById('updPrecioCompra').value || null,
    precioVenta: document.getElementById('updPrecioVenta').value || null,
    stock: document.getElementById('updStock').value || null,
    stockMinimo: document.getElementById('updStockMinimo').value || null,
    proveedor: document.getElementById('updProveedor').value
  };
  // Remove null/empty keys to avoid overwriting with empty values if desired
  Object.keys(payload).forEach(k => {
    if (payload[k] === null || payload[k] === '') delete payload[k];
  });

  try {
    const resp = await fetch(`${REST_BASE}/${encodeURIComponent(codigo)}`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const text = await resp.text();
    if (!resp.ok) {
      // try parse json message
      let raw = text;
      try { raw = JSON.stringify(JSON.parse(text), null, 2); } catch(e){}
      renderResult({status: 'error', message: `Error ${resp.status}`, raw});
      return;
    }
    // resp may return JSON articulo
    let json;
    try { json = JSON.parse(text); } catch (e) { json = null; }
    if (json) {
      renderResult({status: 'success', message: 'Artículo actualizado.', fields: json, raw: JSON.stringify(json, null, 2)});
    } else {
      renderResult({status: 'success', message: 'Artículo actualizado.', fields: {}, raw: text});
    }
  } catch (err) {
    renderResult({status: 'error', message: err.message, raw: ''});
  }
});

// Bind listar button (navega a la sección listar y carga datos)
document.getElementById('btnListar').addEventListener('click', () => { showSection('section-listar'); listArticulos(); });

async function callSoap(soapRequest) {
  try {
    const response = await fetch(SOAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'Authorization': 'Basic ' + btoa(`${USER}:${PASS}`)
      },
      body: soapRequest
    });
    const text = await response.text();
    return {ok: response.ok, text};
  } catch (err) {
    return {ok: false, error: err.message};
  }
}

// Manejo de formulario insertar
document.getElementById('formInsertar').addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    codigo: document.getElementById('codigo').value,
    nombre: document.getElementById('nombre').value,
    categoria: document.getElementById('categoria').value,
    precioCompra: document.getElementById('precioCompra').value,
    precioVenta: document.getElementById('precioVenta').value,
    stock: document.getElementById('stock').value,
    stockMinimo: document.getElementById('stockMinimo').value,
    proveedor: document.getElementById('proveedor').value
  };

  const soap = crearSoapInsertar(data);
  const res = await callSoap(soap);
  if (!res.ok) {
    renderResult({status: 'error', message: res.error || 'No se pudo conectar al servicio.', raw: res.text || ''});
    return;
  }

  const doc = parseXml(res.text);
  if (!doc) {
    renderResult({status: 'error', message: 'Respuesta no válida.', raw: res.text});
    return;
  }

  // Detectar Fault
  const fault = findFirst(doc, 'Fault') || findFirst(doc, 'fault');
  if (fault) {
    const faultString = findFirst(fault, 'faultstring') ? fault.getElementsByTagName('faultstring')[0].textContent : fault.textContent;
    renderResult({status: 'error', message: faultString || 'SOAP Fault recibido', raw: res.text});
    return;
  }

  // Buscar artículo insertado o información de respuesta
  const artNode = findFirst(doc, 'articulo') || findFirst(doc, 'Articulo') || findFirst(doc, 'ArticuloResponse');
  const fields = extractFieldsFromArticulo(artNode);
  renderResult({type: 'insert', status: 'success', message: 'Artículo insertado (o respuesta del servidor).', fields, raw: res.text});
});

// Manejo de formulario consultar
document.getElementById('formConsultar').addEventListener('submit', async e => {
  e.preventDefault();
  const codigo = document.getElementById('buscarCodigo').value;
  const soap = crearSoapConsulta(codigo);
  const res = await callSoap(soap);
  if (!res.ok) {
    renderResult({status: 'error', message: res.error || 'No se pudo conectar al servicio.', raw: res.text || ''});
    return;
  }

  const doc = parseXml(res.text);
  if (!doc) {
    renderResult({status: 'error', message: 'Respuesta no válida.', raw: res.text});
    return;
  }

  const fault = findFirst(doc, 'Fault') || findFirst(doc, 'fault');
  if (fault) {
    const faultString = findFirst(fault, 'faultstring') ? fault.getElementsByTagName('faultstring')[0].textContent : fault.textContent;
    renderResult({status: 'error', message: faultString || 'SOAP Fault recibido', raw: res.text});
    return;
  }

  const artNode = findFirst(doc, 'articulo') || findFirst(doc, 'Articulo');
  const fields = extractFieldsFromArticulo(artNode);
  if (Object.keys(fields).length === 0) {
    // intentar obtener datos directos de la respuesta
    const bodyText = doc.documentElement ? doc.documentElement.textContent : '';
    renderResult({type: 'consulta', status: 'info', message: 'No se encontraron campos de artículo', fields: {}, raw: res.text});
    return;
  }

  renderResult({type: 'consulta', status: 'success', message: 'Artículo encontrado', fields, raw: res.text});
});

// Estado inicial
setStatusBadge('neutral', 'Listo');
setTimestamp();
// Mostrar sección por defecto
showSection('section-ingresar');