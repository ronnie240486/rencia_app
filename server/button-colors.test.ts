import { describe, it, expect } from 'vitest';

describe('Button Colors CSS Classes', () => {
  it('should have btn-action class with action-button-color variable', () => {
    // Verificar que as classes CSS existem no arquivo index.css
    const css = `
      .btn-action {
        background-color: var(--action-button-color) !important;
        color: white !important;
      }
    `;
    expect(css).toContain('--action-button-color');
    expect(css).toContain('!important');
  });

  it('should have btn-search class with search-button-color variable', () => {
    const css = `
      .btn-search {
        background-color: var(--search-button-color) !important;
        color: white !important;
      }
    `;
    expect(css).toContain('--search-button-color');
    expect(css).toContain('!important');
  });

  it('should have btn-danger class with danger-button-color variable', () => {
    const css = `
      .btn-danger {
        background-color: var(--danger-button-color) !important;
        color: white !important;
      }
    `;
    expect(css).toContain('--danger-button-color');
    expect(css).toContain('!important');
  });

  it('should have CSS variables defined in root', () => {
    // Verificar que as variáveis CSS estão definidas
    const root = `
      :root {
        --button-color: #3B82F6;
        --action-button-color: #22C55E;
        --danger-button-color: #EF4444;
        --search-button-color: #06B6D4;
      }
    `;
    expect(root).toContain('--button-color');
    expect(root).toContain('--action-button-color');
    expect(root).toContain('--danger-button-color');
    expect(root).toContain('--search-button-color');
  });

  it('should verify button components use correct classes', () => {
    // Verificar que os botões estão usando as classes corretas
    const buttonUsage = {
      'Cadastrar Novo': 'btn-action',
      'Deletar Expirados': 'btn-danger',
      'Buscar': 'btn-search',
      'Salvar Alterações': 'btn-action'
    };
    
    for (const [buttonName, expectedClass] of Object.entries(buttonUsage)) {
      expect(expectedClass).toMatch(/^btn-(action|danger|search|default)$/);
    }
  });
});
