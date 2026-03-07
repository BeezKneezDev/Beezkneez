export default function About() {
  function scrollToContact(e) {
    e.preventDefault()
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="about">
      <div className="container">
        <div className="about-wrapper animate-in">
          <div className="about-photo">
            <img src="/profile.jpg" alt="Byron — Beezkneez Lawns" />
          </div>
          <div className="about-text">
            <div className="section-tag">About Me</div>
            <h2 className="section-title">A bit about me</h2>
            <p>I'm a local Rotorua dad who loves being outdoors, helping people, and getting stuck into the garden. After years in web development, I wanted something just as rewarding but with the flexibility to be there for my kids — coaching their soccer teams and not missing the stuff that matters.</p>
            <p>That's how Beezkneez was born. I get to do work I genuinely enjoy, help keep my community looking sharp, and still be the dad I want to be. If you need someone reliable who actually cares about doing a good job — give me a shout.</p>
            <a href="#contact" className="btn btn-primary" onClick={scrollToContact}>Get in Touch</a>
          </div>
        </div>
      </div>
    </section>
  )
}
