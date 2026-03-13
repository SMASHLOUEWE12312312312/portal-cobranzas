/**
 * @fileoverview EmailTemplateKit - Sistema de Templates Premium para Emails
 * @version 2.0.0
 * @author Portal Cobranzas Team
 * @lastModified 2026-01-27
 * 
 * COMPONENTES:
 * - buildLayout: Layout principal responsive
 * - kpiCard: Tarjeta de KPI con delta y severidad
 * - sectionTitle: Título de sección
 * - dataTable: Tabla de datos responsive
 * - progressBar: Barra de progreso HTML
 * - badge: Etiqueta de severidad
 * - ctaButton: Botón de call-to-action
 * - divider: Separador visual
 * - alertBox: Caja de alerta destacada
 * 
 * HELPERS:
 * - formatCurrency, formatNumber, formatPct, formatDate
 * - trendArrow, severityBadge, dayStatusBadge
 * - calculateDelta, getDeltaDisplay
 */

const EmailTemplateKit = {
  // ==================== CONFIGURACIÓN DE DISEÑO ====================
  DESIGN: {
    // Colores de marca
    BRAND: {
      PRIMARY: '#1565C0',
      PRIMARY_DARK: '#0D47A1',
      SECONDARY: '#2E7D32',
      ACCENT: '#FF6F00'
    },
    // Colores de severidad
    SEVERITY: {
      OK: { bg: '#E8F5E9', text: '#1B5E20', border: '#4CAF50' },
      WARN: { bg: '#FFF3E0', text: '#E65100', border: '#FF9800' },
      CRITICAL: { bg: '#FFEBEE', text: '#C62828', border: '#F44336' },
      INFO: { bg: '#E3F2FD', text: '#1565C0', border: '#2196F3' },
      NEUTRAL: { bg: '#F5F5F5', text: '#424242', border: '#9E9E9E' }
    },
    // Colores de tendencia
    TREND: {
      UP: '#C62828',      // Rojo para DSO/vencido (malo que suba)
      DOWN: '#2E7D32',    // Verde (bueno que baje)
      STABLE: '#757575',  // Gris neutral
      UP_GOOD: '#2E7D32', // Verde cuando subir es bueno (gestiones)
      DOWN_BAD: '#C62828' // Rojo cuando bajar es malo
    },
    // Fuentes
    FONT: {
      FAMILY: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
      SIZE_XS: '11px',
      SIZE_SM: '12px',
      SIZE_BASE: '14px',
      SIZE_MD: '16px',
      SIZE_LG: '20px',
      SIZE_XL: '24px',
      SIZE_2XL: '32px'
    },
    // Espaciado
    SPACING: {
      XS: '4px',
      SM: '8px',
      MD: '16px',
      LG: '24px',
      XL: '32px'
    },
    // Bordes
    BORDER: {
      RADIUS_SM: '4px',
      RADIUS_MD: '8px',
      RADIUS_LG: '12px'
    }
  },

  // ==================== HELPERS DE FORMATEO ====================
  
  /**
   * Formatea número como moneda
   */
  formatCurrency(amount, currency = 'PEN') {
    if (amount === null || amount === undefined || isNaN(amount)) return '—';
    const symbol = currency === 'USD' ? 'US$' : 'S/.';
    return `${symbol} ${this.formatNumber(amount)}`;
  },

  /**
   * Formatea número con separadores de miles
   */
  formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return Number(num).toLocaleString('es-PE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  /**
   * Formatea número entero sin decimales
   */
  formatInt(num) {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return Number(num).toLocaleString('es-PE', { maximumFractionDigits: 0 });
  },

  /**
   * Formatea porcentaje
   */
  formatPct(value, decimals = 1) {
    if (value === null || value === undefined || isNaN(value)) return '—';
    return `${Number(value).toFixed(decimals)}%`;
  },

  /**
   * Formatea fecha
   */
  formatDate(date, includeTime = false) {
    if (!date) return '—';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '—';
    
    const options = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      timeZone: 'America/Lima'
    };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return d.toLocaleDateString('es-PE', options);
  },

  /**
   * Formatea fecha larga con día de semana
   */
  formatDateLong(date) {
    if (!date) return '—';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Lima'
    });
  },

  /**
   * Retorna flecha de tendencia con color
   */
  trendArrow(trend, invertColors = false) {
    const colors = this.DESIGN.TREND;
    let arrow, color;
    
    switch (trend) {
      case 'up':
        arrow = '↑';
        color = invertColors ? colors.UP_GOOD : colors.UP;
        break;
      case 'down':
        arrow = '↓';
        color = invertColors ? colors.DOWN_BAD : colors.DOWN;
        break;
      default:
        arrow = '→';
        color = colors.STABLE;
    }
    
    return `<span style="color:${color};font-weight:600;">${arrow}</span>`;
  },

  /**
   * Calcula delta entre dos valores
   */
  calculateDelta(current, previous) {
    if (previous === null || previous === undefined || previous === 0) {
      return { value: null, pct: null, trend: 'stable' };
    }
    const diff = current - previous;
    const pct = (diff / Math.abs(previous)) * 100;
    const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';
    return { value: diff, pct, trend };
  },

  /**
   * Genera display de delta con formato
   */
  getDeltaDisplay(current, previous, options = {}) {
    const { format = 'number', invertColors = false, showPct = false } = options;
    
    if (previous === null || previous === undefined) {
      return '<span style="color:#9E9E9E;font-size:11px;">—</span>';
    }
    
    const delta = this.calculateDelta(current, previous);
    if (delta.value === null) {
      return '<span style="color:#9E9E9E;font-size:11px;">—</span>';
    }
    
    const colors = this.DESIGN.TREND;
    let color;
    if (delta.trend === 'up') {
      color = invertColors ? colors.UP_GOOD : colors.UP;
    } else if (delta.trend === 'down') {
      color = invertColors ? colors.DOWN_BAD : colors.DOWN;
    } else {
      color = colors.STABLE;
    }
    
    const sign = delta.value > 0 ? '+' : '';
    let valueStr;
    switch (format) {
      case 'currency':
        valueStr = `${sign}${this.formatNumber(delta.value)}`;
        break;
      case 'pct':
        valueStr = `${sign}${delta.value.toFixed(1)}pp`;
        break;
      default:
        valueStr = `${sign}${this.formatInt(delta.value)}`;
    }
    
    const arrow = delta.trend === 'up' ? '↑' : delta.trend === 'down' ? '↓' : '→';
    const pctDisplay = showPct && delta.pct !== null ? ` (${delta.pct > 0 ? '+' : ''}${delta.pct.toFixed(0)}%)` : '';
    
    return `<span style="color:${color};font-size:11px;font-weight:500;">${arrow} ${valueStr}${pctDisplay}</span>`;
  },

  /**
   * Determina severidad basada en umbrales
   */
  getSeverity(value, thresholds) {
    const { critical, warn, okBelow = true } = thresholds;
    if (okBelow) {
      // Para métricas donde menor es mejor (DSO, % vencido)
      if (value >= critical) return 'CRITICAL';
      if (value >= warn) return 'WARN';
      return 'OK';
    } else {
      // Para métricas donde mayor es mejor (tasa cumplimiento)
      if (value <= critical) return 'CRITICAL';
      if (value <= warn) return 'WARN';
      return 'OK';
    }
  },

  // ==================== COMPONENTES DE UI ====================

  /**
   * Layout principal del email
   */
  buildLayout(options) {
    const {
      brandColor = this.DESIGN.BRAND.PRIMARY,
      brandColorDark = this.DESIGN.BRAND.PRIMARY_DARK,
      title,
      subtitle,
      statusBadge,
      contentHtml,
      footerHtml,
      preheader
    } = options;

    const preheaderHtml = preheader 
      ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>`
      : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .kpi-grid td { display: block !important; width: 100% !important; }
      .email-wrapper { padding: 12px 8px !important; }
      .content-padding { padding: 16px !important; }
    }
  </style>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F5F5F5;font-family:${this.DESIGN.FONT.FAMILY};-webkit-font-smoothing:antialiased;">
  ${preheaderHtml}
  
  <!-- Container principal -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F5F5F5;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        
        <!-- Email wrapper -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${brandColor},${brandColorDark});padding:24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:600;letter-spacing:-0.3px;">Portal de Cobranzas</h1>
                    <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Transperuana Corredores de Seguros</p>
                  </td>
                  ${statusBadge ? `<td align="right" valign="middle">${statusBadge}</td>` : ''}
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Título del reporte -->
          <tr>
            <td style="padding:24px 32px 16px;border-bottom:1px solid #EEEEEE;">
              <h2 style="margin:0;color:#212121;font-size:18px;font-weight:600;">${title}</h2>
              ${subtitle ? `<p style="margin:6px 0 0;color:#757575;font-size:13px;">${subtitle}</p>` : ''}
            </td>
          </tr>
          
          <!-- Contenido -->
          <tr>
            <td style="padding:24px 32px;">
              ${contentHtml}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color:#FAFAFA;padding:20px 32px;border-top:1px solid #EEEEEE;">
              ${footerHtml || this._defaultFooter()}
            </td>
          </tr>
          
        </table>
        
        <!-- Sub-footer -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;">
          <tr>
            <td style="padding:16px 32px;text-align:center;">
              <p style="margin:0;color:#9E9E9E;font-size:11px;">
                Correo automático generado por el Portal de Cobranzas — No responder
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>`;
  },

  /**
   * Footer por defecto
   */
  _defaultFooter() {
    const timestamp = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="color:#757575;font-size:12px;">
            <strong>Metodología</strong><br>
            <span style="color:#9E9E9E;font-size:11px;">
              <strong>DSO:</strong> Promedio ponderado por monto de días desde vencimiento.
              <strong>Aging:</strong> Clasificación por días de mora (0-30, 31-60, 61-90, 90+); % por cantidad y por monto.
              <strong>Cobertura:</strong> % de cuentas vencidas con al menos 1 gestión en el periodo.
              <strong>Deltas:</strong> Variación vs periodo anterior (↑ sube, ↓ baja).
              <strong>Tasa cumplimiento:</strong> PTPs pagados / (pagados + incumplidos).
              <strong>Moneda:</strong> Cartera incluye PEN y USD; montos se muestran separados donde es posible. Totales mixtos se indican con (PEN+USD).
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding-top:12px;color:#9E9E9E;font-size:11px;">
            Generado: ${timestamp}
          </td>
        </tr>
      </table>
    `;
  },

  /**
   * Badge de estado del día (OK/WARN/CRITICAL)
   */
  dayStatusBadge(status) {
    const configs = {
      OK: { 
        bg: 'rgba(46,125,50,0.9)', 
        icon: '✓', 
        text: 'Todo en orden',
        glow: 'rgba(76,175,80,0.3)'
      },
      WARN: { 
        bg: 'rgba(230,81,0,0.9)', 
        icon: '⚡', 
        text: 'Requiere atención',
        glow: 'rgba(255,152,0,0.3)'
      },
      CRITICAL: { 
        bg: 'rgba(198,40,40,0.9)', 
        icon: '⚠', 
        text: 'Acción urgente',
        glow: 'rgba(244,67,54,0.3)'
      }
    };
    
    const config = configs[status] || configs.OK;
    
    return `
      <div style="display:inline-block;background:${config.bg};color:#FFFFFF;padding:8px 14px;border-radius:20px;font-size:12px;font-weight:600;box-shadow:0 2px 8px ${config.glow};">
        <span style="margin-right:4px;">${config.icon}</span>
        ${config.text}
      </div>
    `;
  },

  /**
   * Tarjeta de KPI con delta y severidad
   */
  kpiCard(options) {
    const {
      label,
      value,
      delta,
      deltaLabel,
      severity = 'NEUTRAL',
      icon,
      benchmark,
      trend,
      invertTrendColors = false,
      small = false
    } = options;

    const sev = this.DESIGN.SEVERITY[severity] || this.DESIGN.SEVERITY.NEUTRAL;
    const padding = small ? '12px 14px' : '16px 18px';
    const valueSize = small ? this.DESIGN.FONT.SIZE_LG : this.DESIGN.FONT.SIZE_XL;
    const labelSize = small ? this.DESIGN.FONT.SIZE_XS : this.DESIGN.FONT.SIZE_SM;
    
    let trendHtml = '';
    if (trend) {
      trendHtml = this.trendArrow(trend, invertTrendColors);
    }
    
    // Siempre generar 2 líneas debajo del label para uniformidad
    const deltaContent = (delta !== undefined && delta !== null && delta !== '')
      ? `${deltaLabel || ''} ${delta}`.trim()
      : '&mdash;';
    const benchmarkContent = (benchmark !== undefined && benchmark !== null)
      ? `Meta: ${benchmark}`
      : '';

    return `
      <td style="padding:6px;vertical-align:top;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${sev.bg};border-radius:${this.DESIGN.BORDER.RADIUS_MD};border-left:3px solid ${sev.border};">
          <tr>
            <td style="padding:16px 18px;vertical-align:top;">
              <div style="color:${sev.text};font-size:${valueSize};font-weight:700;line-height:1.2;">
                ${icon ? `<span style="margin-right:4px;">${icon}</span>` : ''}${value} ${trendHtml}
              </div>
              <div style="color:#666666;font-size:${labelSize};margin-top:6px;text-transform:uppercase;letter-spacing:0.3px;">${label}</div>
              <div style="font-size:11px;color:${delta ? sev.text : 'transparent'};margin-top:4px;opacity:0.85;">${deltaContent}</div>
              <div style="font-size:10px;color:${benchmarkContent ? '#9E9E9E' : 'transparent'};margin-top:2px;">${benchmarkContent || '&nbsp;'}</div>
            </td>
          </tr>
        </table>
      </td>
    `;
  },

  /**
   * Grid de KPIs (scoreboard)
   */
  kpiGrid(kpis, columns = 4) {
    let html = '<table role="presentation" cellpadding="0" cellspacing="0" width="100%">';
    
    for (let i = 0; i < kpis.length; i += columns) {
      html += '<tr>';
      for (let j = 0; j < columns && (i + j) < kpis.length; j++) {
        const width = Math.floor(100 / columns);
        html += `<td width="${width}%" valign="top">${this.kpiCard(kpis[i + j])}</td>`;
      }
      // Rellenar celdas vacías si es necesario
      const remaining = columns - (kpis.length - i);
      if (remaining > 0 && remaining < columns) {
        for (let k = 0; k < remaining; k++) {
          html += '<td></td>';
        }
      }
      html += '</tr>';
    }
    
    html += '</table>';
    return html;
  },

  /**
   * Título de sección
   */
  sectionTitle(title, icon, subtitle) {
    return `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;margin-bottom:12px;">
        <tr>
          <td style="border-bottom:2px solid #E0E0E0;padding-bottom:8px;">
            <h3 style="margin:0;color:#212121;font-size:15px;font-weight:600;">
              ${icon ? `<span style="margin-right:6px;">${icon}</span>` : ''}${title}
            </h3>
            ${subtitle ? `<p style="margin:4px 0 0;color:#757575;font-size:12px;">${subtitle}</p>` : ''}
          </td>
        </tr>
      </table>
    `;
  },

  /**
   * Tabla de datos responsive
   */
  dataTable(options) {
    const {
      headers,
      rows,
      highlightColumn,
      emptyMessage = 'Sin datos disponibles',
      compact = false
    } = options;

    if (!rows || rows.length === 0) {
      return `
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#FAFAFA;border-radius:8px;">
          <tr>
            <td style="padding:24px;text-align:center;color:#757575;font-size:13px;">
              ${emptyMessage}
            </td>
          </tr>
        </table>
      `;
    }

    const cellPadding = compact ? '8px 10px' : '12px 14px';
    const fontSize = compact ? '12px' : '13px';

    let html = `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
        <thead>
          <tr style="background:#F5F5F5;">
    `;

    headers.forEach((header, idx) => {
      const align = header.align || 'left';
      const width = header.width || 'auto';
      html += `<th style="padding:${cellPadding};text-align:${align};font-size:11px;font-weight:600;color:#616161;text-transform:uppercase;letter-spacing:0.3px;border-bottom:2px solid #E0E0E0;${width !== 'auto' ? `width:${width};` : ''}">${header.label}</th>`;
    });

    html += '</tr></thead><tbody>';

    rows.forEach((row, rowIdx) => {
      const bgColor = rowIdx % 2 === 0 ? '#FFFFFF' : '#FAFAFA';
      html += `<tr style="background:${bgColor};">`;
      
      row.forEach((cell, cellIdx) => {
        const header = headers[cellIdx] || {};
        const align = header.align || 'left';
        const isHighlight = highlightColumn === cellIdx;
        const fontWeight = isHighlight ? '600' : '400';
        const cellContent = cell !== null && cell !== undefined ? cell : '—';
        
        html += `<td style="padding:${cellPadding};text-align:${align};font-size:${fontSize};color:#424242;border-bottom:1px solid #EEEEEE;font-weight:${fontWeight};">${cellContent}</td>`;
      });
      
      html += '</tr>';
    });

    html += '</tbody></table>';
    return html;
  },

  /**
   * Barra de progreso HTML puro
   */
  progressBar(percentage, options = {}) {
    const {
      color = this.DESIGN.BRAND.PRIMARY,
      height = '8px',
      showLabel = true,
      label
    } = options;

    const pct = Math.max(0, Math.min(100, percentage || 0));
    const bgColor = this._lightenColor(color, 0.8);

    return `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${showLabel ? `
        <tr>
          <td style="font-size:11px;color:#616161;padding-bottom:4px;">${label || ''}</td>
          <td style="font-size:11px;color:#424242;text-align:right;padding-bottom:4px;font-weight:600;">${pct.toFixed(1)}%</td>
        </tr>
        ` : ''}
        <tr>
          <td colspan="2">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${bgColor};border-radius:4px;overflow:hidden;">
              <tr>
                <td style="width:${pct}%;height:${height};background:${color};border-radius:4px;"></td>
                <td style="width:${100 - pct}%;"></td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  },

  /**
   * Helper para aclarar color
   */
  _lightenColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    const newR = Math.round(r + (255 - r) * factor);
    const newG = Math.round(g + (255 - g) * factor);
    const newB = Math.round(b + (255 - b) * factor);
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  },

  /**
   * Badge de severidad
   */
  badge(text, severity = 'NEUTRAL', small = false) {
    const sev = this.DESIGN.SEVERITY[severity] || this.DESIGN.SEVERITY.NEUTRAL;
    const padding = small ? '2px 6px' : '4px 10px';
    const fontSize = small ? '10px' : '11px';

    return `<span style="display:inline-block;background:${sev.bg};color:${sev.text};padding:${padding};border-radius:4px;font-size:${fontSize};font-weight:600;text-transform:uppercase;letter-spacing:0.3px;">${text}</span>`;
  },

  /**
   * Botón de call-to-action
   */
  ctaButton(text, url, options = {}) {
    const {
      primary = true,
      icon,
      fullWidth = false
    } = options;

    const bgColor = primary ? this.DESIGN.BRAND.PRIMARY : '#FFFFFF';
    const textColor = primary ? '#FFFFFF' : this.DESIGN.BRAND.PRIMARY;
    const border = primary ? 'none' : `2px solid ${this.DESIGN.BRAND.PRIMARY}`;
    const width = fullWidth ? '100%' : 'auto';

    return `
      <table role="presentation" cellpadding="0" cellspacing="0" ${fullWidth ? 'width="100%"' : ''} style="display:inline-table;">
        <tr>
          <td style="background:${bgColor};border-radius:8px;border:${border};">
            <a href="${url}" target="_blank" style="display:inline-block;padding:12px 24px;color:${textColor};text-decoration:none;font-size:14px;font-weight:600;width:${width};text-align:center;box-sizing:border-box;">
              ${icon ? `<span style="margin-right:6px;">${icon}</span>` : ''}${text}
            </a>
          </td>
        </tr>
      </table>
    `;
  },

  /**
   * Grupo de CTAs
   */
  ctaGroup(buttons, align = 'left') {
    let html = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td align="${align}" style="padding-top:16px;">`;
    
    buttons.forEach((btn, idx) => {
      if (idx > 0) html += '<span style="display:inline-block;width:12px;"></span>';
      html += this.ctaButton(btn.text, btn.url, btn.options || {});
    });
    
    html += '</td></tr></table>';
    return html;
  },

  /**
   * Separador visual
   */
  divider(margin = '20px') {
    return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:${margin} 0;"><tr><td style="border-top:1px solid #EEEEEE;"></td></tr></table>`;
  },

  /**
   * Caja de alerta destacada
   */
  alertBox(options) {
    const {
      type = 'INFO', // INFO, WARN, CRITICAL, OK
      title,
      message,
      icon
    } = options;

    const sev = this.DESIGN.SEVERITY[type] || this.DESIGN.SEVERITY.INFO;
    const defaultIcons = {
      OK: '✓',
      INFO: 'ℹ',
      WARN: '⚡',
      CRITICAL: '⚠'
    };

    return `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${sev.bg};border-left:4px solid ${sev.border};border-radius:0 8px 8px 0;margin:12px 0;">
        <tr>
          <td style="padding:16px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="32" valign="top" style="font-size:20px;">${icon || defaultIcons[type]}</td>
                <td style="padding-left:12px;">
                  ${title ? `<div style="color:${sev.text};font-size:14px;font-weight:600;margin-bottom:4px;">${title}</div>` : ''}
                  <div style="color:#424242;font-size:13px;line-height:1.5;">${message}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  },

  /**
   * Lista de prioridades/acciones
   */
  priorityList(items, title, icon = '🎯') {
    if (!items || items.length === 0) return '';

    let html = this.sectionTitle(title, icon);
    html += '<table role="presentation" cellpadding="0" cellspacing="0" width="100%">';

    items.forEach((item, idx) => {
      const sev = this.DESIGN.SEVERITY[item.severity] || this.DESIGN.SEVERITY.INFO;
      html += `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #EEEEEE;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="28" valign="top">
                  <div style="width:24px;height:24px;background:${sev.bg};border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:${sev.text};">${idx + 1}</div>
                </td>
                <td style="padding-left:12px;">
                  <div style="color:#212121;font-size:14px;font-weight:500;">${item.title}</div>
                  ${item.description ? `<div style="color:#757575;font-size:12px;margin-top:2px;">${item.description}</div>` : ''}
                </td>
                ${item.badge ? `<td width="80" align="right" valign="middle">${this.badge(item.badge, item.severity, true)}</td>` : ''}
              </tr>
            </table>
          </td>
        </tr>
      `;
    });

    html += '</table>';
    return html;
  },

  /**
   * Tarjeta de cuenta/cliente en riesgo
   */
  riskAccountCard(account) {
    const {
      asegurado,
      bucket,
      dias,
      monto,
      moneda = 'PEN',
      responsable,
      accionSugerida,
      severity = 'WARN'
    } = account;

    const sev = this.DESIGN.SEVERITY[severity] || this.DESIGN.SEVERITY.WARN;

    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #EEEEEE;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <div style="font-size:14px;font-weight:600;color:#212121;">${asegurado}</div>
                <div style="font-size:12px;color:#757575;margin-top:4px;">
                  ${bucket ? `<span style="margin-right:12px;">📊 ${bucket}</span>` : ''}
                  ${dias !== undefined ? `<span style="margin-right:12px;">📅 ${dias} días</span>` : ''}
                  ${responsable ? `<span>👤 ${responsable}</span>` : ''}
                </div>
              </td>
              <td align="right" valign="top">
                <div style="font-size:15px;font-weight:700;color:${sev.text};">${this.formatCurrency(monto, moneda)}</div>
              </td>
            </tr>
            ${accionSugerida ? `
            <tr>
              <td colspan="2" style="padding-top:8px;">
                <div style="background:${sev.bg};padding:8px 12px;border-radius:6px;font-size:12px;color:${sev.text};">
                  <strong>Acción:</strong> ${accionSugerida}
                </div>
              </td>
            </tr>
            ` : ''}
          </table>
        </td>
      </tr>
    `;
  },

  /**
   * Lista de cuentas en riesgo
   */
  riskAccountList(accounts, title = 'Cuentas en Riesgo', icon = '⚠️') {
    if (!accounts || accounts.length === 0) return '';

    let html = this.sectionTitle(title, icon, `Top ${accounts.length} por prioridad`);
    html += '<table role="presentation" cellpadding="0" cellspacing="0" width="100%">';
    
    accounts.forEach(account => {
      html += this.riskAccountCard(account);
    });
    
    html += '</table>';
    return html;
  },

  /**
   * Mini tarjeta de PTP próximo
   */
  ptpCard(ptp) {
    const {
      asegurado,
      monto,
      montoComprometido,
      moneda = 'PEN',
      fechaCompromiso,
      diasRestantes,
      vencido,
      responsable
    } = ptp;

    // Usar monto o montoComprometido (lo que esté disponible)
    const montoDisplay = monto || montoComprometido || 0;

    let statusColor, statusText, statusBg;
    if (vencido) {
      statusColor = '#C62828';
      statusBg = '#FFEBEE';
      statusText = `Vencido hace ${Math.abs(diasRestantes)} día(s)`;
    } else if (diasRestantes === 0) {
      statusColor = '#E65100';
      statusBg = '#FFF3E0';
      statusText = 'Vence HOY';
    } else {
      statusColor = '#1565C0';
      statusBg = '#E3F2FD';
      statusText = `En ${diasRestantes} día(s)`;
    }

    return `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #EEEEEE;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <div style="font-size:13px;font-weight:500;color:#212121;">${asegurado}</div>
                <div style="font-size:11px;color:#757575;margin-top:2px;">${this.formatDate(fechaCompromiso)}</div>
              </td>
              <td align="center" width="110">
                <span style="display:inline-block;background:${statusBg};color:${statusColor};padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;">${statusText}</span>
              </td>
              <td align="right" width="110">
                ${montoDisplay > 0
                  ? `<div style="font-size:14px;font-weight:600;color:#212121;">${this.formatCurrency(montoDisplay, moneda)}</div>`
                  : `<div style="font-size:12px;color:#9E9E9E;">—</div>`
                }
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  },

  /**
   * Lista de PTPs próximos
   */
  ptpList(ptps, title = 'Próximos Vencimientos', icon = '📅') {
    if (!ptps || ptps.length === 0) return '';

    let html = this.sectionTitle(title, icon, 'Compromisos de pago en las próximas 72h');
    html += '<table role="presentation" cellpadding="0" cellspacing="0" width="100%">';
    
    ptps.forEach(ptp => {
      html += this.ptpCard(ptp);
    });
    
    html += '</table>';
    return html;
  },

  /**
   * Tabla de aging con barras de progreso
   */
  agingTable(buckets, options = {}) {
    const { showAmount = true, title = 'Distribución por Antigüedad' } = options;

    if (!buckets || buckets.length === 0) return '';

    const bucketColors = {
      'CURRENT': '#4CAF50',
      'BUCKET_31_60': '#FFC107',
      'BUCKET_61_90': '#FF9800',
      'BUCKET_90_PLUS': '#F44336'
    };

    let html = this.sectionTitle(title, '📊');
    html += '<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:8px;">';

    buckets.forEach(bucket => {
      const color = bucketColors[bucket.id] || '#9E9E9E';
      const barWidth = Math.max(2, bucket.percentage || 0);

      html += `
        <tr>
          <td style="padding:8px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="140" style="font-size:13px;color:#424242;">${bucket.label}</td>
                <td style="padding:0 12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#EEEEEE;border-radius:4px;overflow:hidden;">
                    <tr>
                      <td style="width:${barWidth}%;height:12px;background:${color};border-radius:4px;"></td>
                      <td></td>
                    </tr>
                  </table>
                </td>
                <td width="60" align="right" style="font-size:13px;font-weight:600;color:#212121;">${this.formatInt(bucket.count)}</td>
                <td width="50" align="right" style="font-size:12px;color:#757575;">${this.formatPct(bucket.percentage)}</td>
              </tr>
              ${showAmount ? `
              <tr>
                <td></td>
                <td colspan="3" style="padding-top:2px;font-size:11px;color:#9E9E9E;">
                  ${bucket.amountPEN != null && bucket.amountUSD != null
                    ? `${this.formatCurrency(bucket.amountPEN, 'PEN')}${bucket.amountUSD > 0 ? ` + ${this.formatCurrency(bucket.amountUSD, 'USD')}` : ''}${bucket.amountPercentage ? ` (${this.formatPct(bucket.amountPercentage)} del monto)` : ''}`
                    : `${this.formatCurrency(bucket.amount)}${bucket.amountPercentage ? ` (${this.formatPct(bucket.amountPercentage)} del monto)` : ''}`
                  }
                </td>
              </tr>
              ` : ''}
            </table>
          </td>
        </tr>
      `;
    });

    html += '</table>';
    return html;
  },

  /**
   * Resumen ejecutivo (3 bullets)
   */
  executiveSummary(items) {
    if (!items || items.length === 0) return '';

    const icons = {
      positive: '✅',
      negative: '⚠️',
      neutral: 'ℹ️'
    };

    let html = `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F5F5F5;border-radius:8px;margin-bottom:20px;">
        <tr>
          <td style="padding:20px;">
            <div style="font-size:13px;font-weight:600;color:#424242;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px;">Resumen Ejecutivo</div>
    `;

    items.forEach((item, idx) => {
      const icon = icons[item.type] || icons.neutral;
      const colors = {
        positive: '#1B5E20',
        negative: '#C62828',
        neutral: '#424242'
      };
      const color = colors[item.type] || colors.neutral;

      html += `
        <div style="display:flex;align-items:flex-start;margin-bottom:${idx < items.length - 1 ? '10px' : '0'};">
          <span style="margin-right:8px;font-size:14px;">${icon}</span>
          <span style="color:${color};font-size:14px;line-height:1.4;">${item.text}</span>
        </div>
      `;
    });

    html += '</td></tr></table>';
    return html;
  },

  /**
   * Tabla de performance por responsable
   */
  performanceTable(responsables, options = {}) {
    const { showTop = 5, title = 'Performance por Responsable' } = options;

    if (!responsables || responsables.length === 0) return '';

    const top = responsables.slice(0, showTop);
    
    let html = this.sectionTitle(title, '👥', `Top ${Math.min(showTop, responsables.length)} por efectividad`);
    
    const headers = [
      { label: 'Responsable', align: 'left' },
      { label: 'Gestiones', align: 'center', width: '70px' },
      { label: 'Cumplimiento', align: 'center', width: '90px' },
      { label: 'Efectividad', align: 'center', width: '80px' }
    ];

    const rows = top.map(r => {
      const efectividadColor = r.efectividad >= 80 ? '#1B5E20' : r.efectividad >= 60 ? '#E65100' : '#C62828';
      return [
        r.responsable,
        this.formatInt(r.totalGestiones),
        `${this.formatPct(r.tasaCumplimiento)}`,
        `<span style="color:${efectividadColor};font-weight:600;">${this.formatPct(r.efectividad)}</span>`
      ];
    });

    html += this.dataTable({ headers, rows, compact: true });
    return html;
  },

  /**
   * Indicador de tendencia textual (mini sparkline)
   * Genera texto como "↑↑→↓↑" basado en valores históricos
   */
  trendIndicator(values, options = {}) {
    const { invertColors = false } = options;
    if (!values || values.length < 2) return '';

    const indicators = [];
    for (let i = 1; i < values.length; i++) {
      const diff = values[i] - values[i - 1];
      if (diff > 0) {
        const color = invertColors ? this.DESIGN.TREND.UP_GOOD : this.DESIGN.TREND.UP;
        indicators.push(`<span style="color:${color};">↑</span>`);
      } else if (diff < 0) {
        const color = invertColors ? this.DESIGN.TREND.DOWN_BAD : this.DESIGN.TREND.DOWN;
        indicators.push(`<span style="color:${color};">↓</span>`);
      } else {
        indicators.push(`<span style="color:${this.DESIGN.TREND.STABLE};">→</span>`);
      }
    }

    return `<span style="font-size:12px;letter-spacing:2px;font-weight:600;">${indicators.join('')}</span>`;
  },

  /**
   * Barra de meta mensual (progress bar con objetivo)
   */
  goalProgressBar(current, target, options = {}) {
    const { label = 'Avance Mensual', currency = true, color = '#2E7D32' } = options;
    if (!target || target <= 0) return '';

    const pct = Math.min(100, Math.max(0, (current / target) * 100));
    const pctColor = pct >= 80 ? '#2E7D32' : pct >= 50 ? '#FF9800' : '#C62828';
    const currentStr = currency ? this.formatCurrency(current) : this.formatInt(current);
    const targetStr = currency ? this.formatCurrency(target) : this.formatInt(target);

    return `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:12px 0;">
        <tr>
          <td>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span style="font-size:12px;font-weight:600;color:#424242;">${label}</span>
              <span style="font-size:12px;color:${pctColor};font-weight:700;">${pct.toFixed(0)}%</span>
            </div>
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#EEEEEE;border-radius:6px;overflow:hidden;">
              <tr>
                <td style="width:${pct}%;height:12px;background:${pctColor};border-radius:6px;"></td>
                <td></td>
              </tr>
            </table>
            <div style="margin-top:4px;font-size:11px;color:#757575;">
              ${currentStr} de ${targetStr}
            </div>
          </td>
        </tr>
      </table>
    `;
  },

  /**
   * Tarjeta de resumen compacta (para info en fila)
   */
  compactSummaryRow(items) {
    if (!items || items.length === 0) return '';

    let cells = '';
    items.forEach((item, idx) => {
      const borderRight = idx < items.length - 1 ? 'border-right:1px solid #EEEEEE;' : '';
      cells += `
        <td style="padding:12px 16px;text-align:center;${borderRight}" width="${Math.floor(100/items.length)}%">
          <div style="font-size:22px;font-weight:700;color:${item.color || '#212121'};">${item.value}</div>
          <div style="font-size:11px;color:#757575;text-transform:uppercase;margin-top:4px;">${item.label}</div>
          ${item.sublabel ? `<div style="font-size:10px;color:#9E9E9E;margin-top:2px;">${item.sublabel}</div>` : ''}
        </td>
      `;
    });

    return `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#FAFAFA;border-radius:8px;border:1px solid #EEEEEE;margin:12px 0;">
        <tr>${cells}</tr>
      </table>
    `;
  },

  /**
   * Lista de acciones recomendadas
   */
  recommendedActions(actions) {
    if (!actions || actions.length === 0) return '';

    let html = this.sectionTitle('Acciones Recomendadas para la Próxima Semana', '📋');
    html += '<table role="presentation" cellpadding="0" cellspacing="0" width="100%">';

    actions.forEach((action, idx) => {
      html += `
        <tr>
          <td style="padding:10px 0;${idx < actions.length - 1 ? 'border-bottom:1px solid #EEEEEE;' : ''}">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="28" valign="top">
                  <div style="width:24px;height:24px;background:#E3F2FD;border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#1565C0;">${idx + 1}</div>
                </td>
                <td style="padding-left:12px;">
                  <div style="color:#212121;font-size:14px;font-weight:500;">${action.accion}</div>
                  <div style="color:#757575;font-size:12px;margin-top:4px;">
                    ${action.responsable ? `<span style="margin-right:12px;">👤 ${action.responsable}</span>` : ''}
                    ${action.objetivo ? `<span>🎯 ${action.objetivo}</span>` : ''}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    });

    html += '</table>';
    return html;
  }
};

// ==================== EXPORTAR PARA USO GLOBAL ====================

/**
 * API: Obtener instancia del kit de templates
 */
function getEmailTemplateKit() {
  return EmailTemplateKit;
}

/**
 * API: Generar HTML de prueba para email diario
 */
function testDailyEmailTemplate_API() {
  const kit = EmailTemplateKit;
  
  // Datos de prueba
  const mockData = {
    gestionesHoy: 15,
    gestionesAyer: 12,
    ptpsPendientes: 8,
    ptpsVencidos: 3,
    ptpsProximos: 5,
    alertasCriticas: 2,
    alertasAltas: 5,
    dso: 42,
    dsoBenchmark: 35,
    porcentajeVencido: 18.5,
    bucket90: { count: 45, percentage: 8.2, amount: 125000 }
  };

  // Construir contenido
  const kpis = [
    {
      label: 'Gestiones Hoy',
      value: kit.formatInt(mockData.gestionesHoy),
      delta: kit.getDeltaDisplay(mockData.gestionesHoy, mockData.gestionesAyer, { invertColors: true }),
      severity: 'OK',
      icon: '📊'
    },
    {
      label: 'PTPs Pendientes',
      value: kit.formatInt(mockData.ptpsPendientes),
      severity: mockData.ptpsVencidos > 0 ? 'WARN' : 'INFO',
      icon: '📋'
    },
    {
      label: 'Alertas Críticas',
      value: kit.formatInt(mockData.alertasCriticas),
      severity: mockData.alertasCriticas > 0 ? 'CRITICAL' : 'OK',
      icon: '⚠️'
    },
    {
      label: 'DSO',
      value: `${mockData.dso} días`,
      severity: mockData.dso > mockData.dsoBenchmark + 10 ? 'CRITICAL' : mockData.dso > mockData.dsoBenchmark ? 'WARN' : 'OK',
      benchmark: `${mockData.dsoBenchmark} días`,
      trend: mockData.dso > mockData.dsoBenchmark ? 'up' : 'stable'
    }
  ];

  const content = kit.kpiGrid(kpis, 2);

  const html = kit.buildLayout({
    title: 'Resumen Diario de Cobranzas',
    subtitle: kit.formatDateLong(new Date()),
    statusBadge: kit.dayStatusBadge(mockData.alertasCriticas > 0 ? 'CRITICAL' : 'OK'),
    contentHtml: content,
    preheader: 'Resumen ejecutivo de cobranzas del día'
  });

  return { ok: true, html, sizeKB: (html.length / 1024).toFixed(2) };
}

/**
 * API: Generar HTML de prueba para email semanal
 */
function testWeeklyEmailTemplate_API() {
  const kit = EmailTemplateKit;
  
  const mockBuckets = [
    { id: 'CURRENT', label: 'Corriente (0-30)', count: 1200, percentage: 65, amount: 450000 },
    { id: 'BUCKET_31_60', label: '31-60 días', count: 350, percentage: 19, amount: 180000 },
    { id: 'BUCKET_61_90', label: '61-90 días', count: 180, percentage: 10, amount: 95000 },
    { id: 'BUCKET_90_PLUS', label: '90+ días', count: 120, percentage: 6, amount: 75000 }
  ];

  const content = kit.agingTable(mockBuckets);

  const html = kit.buildLayout({
    brandColor: '#2E7D32',
    brandColorDark: '#1B5E20',
    title: 'Reporte Semanal de Cobranzas',
    subtitle: 'Semana 5 · 2026',
    contentHtml: content,
    preheader: 'Métricas semanales de performance de cobranzas'
  });

  return { ok: true, html, sizeKB: (html.length / 1024).toFixed(2) };
}
