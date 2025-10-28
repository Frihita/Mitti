class CustomNavbar extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        nav {
          background: linear-gradient(135deg, #8b5cf6 0%, #f59e0b 100%);
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .logo { 
          color: white; 
          font-weight: bold; 
          font-size: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .logo span {
          font-family: 'Noto Sans Devanagari', sans-serif;
        }
        .actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        .language-toggle {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.2s;
        }
        .language-toggle:hover {
          background: rgba(255,255,255,0.3);
        }
      </style>
      <nav>
        <div class="logo">
          Mitti <span>मिट्टी</span>
        </div>
        <div class="actions">
          <button id="languageToggle" class="language-toggle">EN</button>
        </div>
      </nav>
    `;
  }
}
customElements.define('custom-navbar', CustomNavbar);
