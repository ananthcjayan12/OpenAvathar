function App() {
  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card glass animate-fade-in" style={{ textAlign: 'center', maxWidth: '500px' }}>
        <h1 className="text-gradient" style={{ fontSize: '3.5rem', marginBottom: '1rem', fontWeight: 800 }}>OpenAvathar</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem' }}>
          Bring Your Own GPU. Spin up pods, generate AI videos, and stay in control.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button className="btn btn-primary">Get Started</button>
          <button className="btn btn-secondary">Learn More</button>
        </div>
      </div>
    </div>
  )
}

export default App
