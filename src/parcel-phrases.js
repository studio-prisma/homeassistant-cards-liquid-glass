/**
 * Common tracking event texts of the larger carriers, mapped to German and
 * English. Carriers send their own wording in their own language; the card
 * shows the translation when a phrase is known and the original otherwise.
 * Nothing leaves the browser.
 *
 * Order matters: the first matching rule wins, so negative and more specific
 * phrases ("could not be delivered", "out for delivery") come before "delivered".
 */

export const PARCEL_PHRASES = [
  {
    key: 'failed',
    de: 'Zustellung nicht möglich', en: 'Delivery attempt failed',
    match: /delivery attempt|attempted delivery|unable to deliver|could not be delivered|not delivered|missed delivery|destinatario assente|non andata a buon fine|mancata consegna|nicht zugestellt|zustellung nicht möglich|nicht angetroffen/i,
  },
  {
    key: 'pickup',
    de: 'Liegt zur Abholung bereit', en: 'Ready for pick-up',
    match: /ready for (pick-?up|collection)|available for (pick-?up|collection)|awaiting collection|in giacenza|disponibile per il ritiro|pronta per il ritiro|zur abholung|abholbereit|in der filiale|packstation/i,
  },
  {
    key: 'out_for_delivery',
    de: 'In Zustellung', en: 'Out for delivery',
    match: /out for delivery|on (the|its) way to you|loaded (on|onto) the delivery vehicle|with (the )?delivery driver|in consegna|in zustellung|wird (heute )?zugestellt|auf dem weg zu ihnen|zustellfahrzeug/i,
  },
  {
    key: 'scheduled',
    de: 'Zustellung geplant', en: 'Delivery scheduled',
    match: /will be delivered|to be delivered|expected (delivery|to be delivered)|scheduled for delivery|estimated delivery|wird [^.]*zugestellt|voraussichtliche zustellung|zustellung (geplant|voraussichtlich)|consegna prevista/i,
  },
  {
    key: 'delivered',
    de: 'Zugestellt', en: 'Delivered',
    match: /\bdelivered\b|è stata consegnata|consegnat[ao]|\bzugestellt\b/i,
  },
  {
    key: 'customs',
    de: 'In der Zollabfertigung', en: 'In customs clearance',
    match: /customs|dogana|\bzoll/i,
  },
  {
    key: 'delayed',
    de: 'Verspätet sich', en: 'Running late',
    match: /delayed|running late|in ritardo|verzögert|verspätet/i,
  },
  {
    key: 'label',
    de: 'Label erstellt, noch nicht beim Paketdienst', en: 'Label created, not yet with the carrier',
    match: /label (has been )?created|created a label|shipping label|instruction data|electronically announced|shipment information received|not (yet )?received the package|aufkleber erstellt|elektronisch angekündigt|auftragsdaten/i,
  },
  {
    key: 'arrived_amazon',
    de: 'Im Amazon-Logistikzentrum angekommen', en: 'Arrived at an Amazon facility',
    match: /arrived at (an |the )?amazon facility/i,
  },
  {
    key: 'left_facility',
    de: 'Hat das Verteilzentrum verlassen', en: 'Left the facility',
    match: /(left|departed( from)?|has left) (the |an )?(amazon |courier |carrier |ups |dhl )?(facility|hub|depot|sort(ing)? (centre|center))|partita dal centro|hat das (paket|verteil)zentrum verlassen/i,
  },
  {
    key: 'arrived_hub',
    de: 'Im Verteilzentrum angekommen', en: 'Arrived at a sorting centre',
    match: /arrived at (the |a )?(courier |carrier |delivery |ups |dhl )?(facility|hub|depot|station|sort(ing)? (centre|center))|arrivata al centro|im (paket|verteil)zentrum (angekommen|eingetroffen)/i,
  },
  {
    key: 'processing',
    de: 'Wird im Verteilzentrum bearbeitet', en: 'Being processed at a sorting centre',
    match: /processing at|processed (in|at) (the )?(parcel|sort)|being processed|in lavorazione|im paketzentrum bearbeitet|wird bearbeitet/i,
  },
  {
    key: 'picked_up',
    de: 'Vom Paketdienst übernommen', en: 'Picked up by the carrier',
    match: /picked up|we have your package|received by (the )?carrier|carrier (has )?received|accepted by|shipment (has been )?received|presa in carico|accettat[ao]|abgeholt|übernommen|eingeliefert/i,
  },
  {
    key: 'in_transit',
    de: 'Unterwegs', en: 'In transit',
    match: /in transit|on the way|shipped|dispatched|in transito|in viaggio|spedit[ao]|unterwegs|versendet/i,
  },
  {
    key: 'changed',
    de: 'Zustellwunsch geändert', en: 'Delivery instructions changed',
    match: /delivery (instructions|options|preferences) (changed|updated)|cambio disposizioni|zustell(wunsch|option)/i,
  },
];

/** The event text in the given language when the phrase is known, else the original. */
export function translateEvent(text, lang) {
  const original = typeof text === 'string' ? text.trim() : '';
  if (!original) return { text: '', translated: false };
  const code = String(lang || 'en').slice(0, 2) === 'de' ? 'de' : 'en';
  for (const rule of PARCEL_PHRASES) {
    if (rule.match.test(original)) {
      const out = rule[code];
      return { text: out, translated: out.toLowerCase() !== original.toLowerCase(), key: rule.key };
    }
  }
  return { text: original, translated: false };
}
