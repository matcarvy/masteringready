interface ScoreCta {
  title: string
  body: string
  button: string
  action: string
}

export function getCtaForScore(score: number, lang: 'es' | 'en'): ScoreCta {
  if (score >= 95) {
    return lang === 'es'
      ? { title: 'Tu mezcla está lista.', body: 'Está técnicamente preparada para el mastering. Si quieres, escríbenos y coordinamos.', button: 'Masterizar este track', action: 'mastering' }
      : { title: 'Your mix is ready.', body: "It's technically prepared for mastering. If you'd like, write us and we'll coordinate.", button: 'Master this track', action: 'mastering' }
  }
  if (score >= 85) {
    return lang === 'es'
      ? { title: 'Tu mezcla está en muy buen estado.', body: 'Hay detalles menores que no comprometen el resultado. Si quieres avanzar, escríbenos.', button: 'Masterizar este track', action: 'mastering' }
      : { title: 'Your mix is in great shape.', body: "There are minor details that won't compromise the result. If you'd like to move forward, write us.", button: 'Master this track', action: 'mastering' }
  }
  if (score >= 75) {
    return lang === 'es'
      ? { title: 'Tu mezcla está cerca.', body: 'Hay aspectos técnicos que conviene revisar antes del mastering. Si necesitas orientación, escríbenos.', button: 'Preparar mi mezcla', action: 'preparation' }
      : { title: 'Your mix is close.', body: 'There are technical aspects worth reviewing before mastering. If you need guidance, write us.', button: 'Prepare my mix', action: 'preparation' }
  }
  if (score >= 60) {
    return lang === 'es'
      ? { title: 'Tu mezcla necesita ajustes antes del mastering.', body: 'Hay decisiones técnicas que pueden afectar el resultado. Si quieres que te ayudemos, escríbenos.', button: 'Revisar mi mezcla', action: 'preparation' }
      : { title: 'Your mix needs adjustments before mastering.', body: "There are technical decisions that could affect the result. If you'd like help, write us.", button: 'Review my mix', action: 'preparation' }
  }
  if (score >= 40) {
    return lang === 'es'
      ? { title: 'Tu mezcla necesita trabajo en áreas clave.', body: 'Enviarlo en este estado limita el margen de maniobra del mastering. Si quieres, escríbenos.', button: 'Trabajar mi mezcla', action: 'review' }
      : { title: 'Your mix needs work in key areas.', body: "In this state, mastering has limited room to work. If you'd like, write us.", button: 'Work on my mix', action: 'review' }
  }
  if (score >= 20) {
    return lang === 'es'
      ? { title: 'Tu mezcla tiene problemas técnicos importantes.', body: 'No recomiendo masterizar en este estado. Si quieres, escríbenos y trabajamos juntos.', button: 'Trabajar mi mezcla', action: 'review' }
      : { title: 'Your mix has significant technical issues.', body: "I don't recommend mastering in this state. If you'd like, write us and we'll work through it together.", button: 'Work on my mix', action: 'review' }
  }
  return lang === 'es'
    ? { title: 'Tu mezcla necesita una revisión profunda.', body: 'Hay decisiones fundamentales que resolver antes del mastering. Si quieres, escríbenos.', button: 'Revisar mi proyecto', action: 'review' }
    : { title: 'Your mix needs a deep review.', body: "There are fundamental decisions to resolve before mastering. If you'd like, write us.", button: 'Review my project', action: 'review' }
}
