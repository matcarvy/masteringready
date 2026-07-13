import { isMasterProfile } from './scoreColor'

interface ScoreCta {
  title: string
  body: string
  button: string
  action: string
}

/**
 * Mirrors _generate_cta_master() in analyzer.py. Without this branch the app
 * offers to master somebody's master.
 *
 * The 60 to 84 band is the best lead the product produces: that person already
 * has a master, they are not happy with it, and they have budget.
 */
function getMasterCta(score: number, lang: 'es' | 'en'): ScoreCta {
  if (score >= 85) {
    // No button: a solid master does not need mastering sold to it.
    return lang === 'es'
      ? { title: 'Tu máster está listo para publicar.', body: 'Respeta el techo digital y conserva dinámica. No necesita otro mastering.', button: '', action: 'release' }
      : { title: 'Your master is ready to release.', body: 'It respects the digital ceiling and it kept its dynamics. It does not need another mastering pass.', button: '', action: 'release' }
  }
  if (score >= 60) {
    return lang === 'es'
      ? { title: 'Tu máster funciona, pero deja valor sobre la mesa.', body: 'Los puntos marcados son los que separan este máster de uno que compite de igual a igual con las referencias de su género. Si quieres, lo revisamos juntos.', button: 'Revisar mi máster', action: 'remaster' }
      : { title: 'Your master works, but it leaves value on the table.', body: 'The points flagged are what separate this master from one that competes head to head with the references in its genre. If you would like, we can go through it together.', button: 'Review my master', action: 'remaster' }
  }
  return lang === 'es'
    ? { title: 'Tu máster tiene defectos técnicos concretos.', body: 'No son cuestión de gusto: están medidos y se escuchan en la reproducción. Conviene resolverlos antes de publicar.', button: 'Revisar mi máster', action: 'remaster' }
    : { title: 'Your master has concrete technical defects.', body: 'These are not a matter of taste: they are measured and they are audible on playback. Worth resolving before release.', button: 'Review my master', action: 'remaster' }
}

export function getCtaForScore(score: number, lang: 'es' | 'en', profile?: string | null): ScoreCta {
  if (isMasterProfile(profile)) {
    return getMasterCta(score, lang)
  }

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
