class CustomBottomNav extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
          padding: 0.5rem 0;
          z-index: 50;
        }
        .nav-items {
          display: flex;
          justify-content: space-around;
        }
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          color: #4a5568;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }
        .nav-item:hover, .nav-item.active {
          color: #8b5cf6;
          background: rgba(139, 92, 246, 0.1);
        }
        .nav-icon {
          font-size: 1.25rem;
          margin-bottom: 0.25rem;
        }
        .nav-label {
          font-size: 0.75rem;
          font-weight: 500;
        }
      </style>
      <div class="bottom-nav">
        <div class="nav-items">
          <a href="index.html" class="nav-item active">
            <div class="nav-icon">🏠</div>
            <div class="nav-label" data-en="Home" data-hi="घर">Home</div>
          </a>
          <a href="share.html" class="nav-item">
            <div class="nav-icon">📝</div>
            <div class="nav-label" data-en="Share" data-hi="साझा करें">Share</div>
          </a>
          <a href="bazaar.html" class="nav-item">
            <div class="nav-icon">🧺</div>
            <div class="nav-label" data-en="Bazaar" data-hi="बाज़ार">Bazaar</div>
          </a>
          <a href="community.html" class="nav-item">
            <div class="nav-icon">💬</div>
            <div class="nav-label" data-en="Community" data-hi="संगत">Community</div>
          </a>
        </div>
      </div>
    `;
  }
}
customElements.define('custom-bottom-nav', CustomBottomNav);
