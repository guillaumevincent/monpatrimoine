export type Categorie = 'cash' | 'obligation' | 'action' | 'exotique' | 'immobilier' | 'dette';

export interface Position {
  id: string;
  label: string;
  categorie: Categorie;
  active: boolean;
}

export interface ValeurPosition {
  date: string;
  positionId: string;
  montant: number;
}

export interface BilanParCategorie {
  cash: number;
  obligation: number;
  action: number;
  exotique: number;
  immobilier: number;
  dette: number;
}

export interface PourcentageParCategorie {
  cash: number;
  obligation: number;
  action: number;
  exotique: number;
  immobilier: number;
  dette: number;
}

export interface PatrimoineInfo {
  patrimoineBrut: number;  // Somme de tous les actifs (valeurs positives)
  passif: number;          // Somme de toutes les dettes (valeurs négatives en valeur absolue)
  patrimoineNet: number;   // Patrimoine brut - passif
  pourcentageDette: number; // (Passif / Patrimoine brut) * 100
}

export interface BilanAvecDate {
  date: string;
  montantParCategorie: BilanParCategorie;
  pourcentageParCategorie: PourcentageParCategorie;
  patrimoine: PatrimoineInfo;
}

export function calculerLeBilan(positions: Position[], valeurs: ValeurPosition[]): BilanAvecDate[] {
  // Collecter toutes les dates uniques des valeurs
  const datesUniques = new Set<string>();
  valeurs.forEach(valeur => {
    datesUniques.add(valeur.date);
  });

  const resultats: BilanAvecDate[] = [];

  // Ajouter l'entrée pour aujourd'hui avec les dernières valeurs
  const bilanAujourdhui: BilanParCategorie = {
    cash: 0,
    obligation: 0,
    action: 0,
    exotique: 0,
    immobilier: 0,
    dette: 0
  };

  positions.forEach(position => {
    // Trouver la dernière valeur pour cette position
    const valeursPosition = valeurs
      .filter(v => v.positionId === position.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (valeursPosition.length > 0) {
      const derniereValeur = valeursPosition[0];
      bilanAujourdhui[position.categorie] += derniereValeur.montant;
    }
  });

  // Calculer le patrimoine pour aujourd'hui
  const patrimoineBrutAujourdhui = Object.entries(bilanAujourdhui)
    .filter(([categorie]) => categorie !== 'dette')
    .reduce((sum, [, montant]) => sum + (montant > 0 ? montant : 0), 0);
  const valeursAujourdhui = Object.values(bilanAujourdhui);
  const passifAujourdhui = Math.abs(bilanAujourdhui.dette) + valeursAujourdhui.filter((montant, index) => montant < 0 && Object.keys(bilanAujourdhui)[index] !== 'dette').reduce((sum, montant) => sum + Math.abs(montant), 0);
  const patrimoineNetAujourdhui = patrimoineBrutAujourdhui - passifAujourdhui;
  const pourcentageDetteAujourdhui = patrimoineBrutAujourdhui > 0 ? (passifAujourdhui / patrimoineBrutAujourdhui * 100) : 0;

  // Calculer les pourcentages pour aujourd'hui
  const totalSansDetteAujourdhui = Object.entries(bilanAujourdhui)
    .filter(([categorie]) => categorie !== 'dette')
    .reduce((sum, [, montant]) => sum + Math.abs(montant), 0);
  
  const pourcentageAujourdhui: PourcentageParCategorie = {
    cash: totalSansDetteAujourdhui > 0 ? (Math.abs(bilanAujourdhui.cash) / totalSansDetteAujourdhui * 100) : 0,
    obligation: totalSansDetteAujourdhui > 0 ? (Math.abs(bilanAujourdhui.obligation) / totalSansDetteAujourdhui * 100) : 0,
    action: totalSansDetteAujourdhui > 0 ? (Math.abs(bilanAujourdhui.action) / totalSansDetteAujourdhui * 100) : 0,
    exotique: totalSansDetteAujourdhui > 0 ? (Math.abs(bilanAujourdhui.exotique) / totalSansDetteAujourdhui * 100) : 0,
    immobilier: totalSansDetteAujourdhui > 0 ? (Math.abs(bilanAujourdhui.immobilier) / totalSansDetteAujourdhui * 100) : 0,
    dette: pourcentageDetteAujourdhui
  };

  resultats.push({
    date: new Date().toISOString(),
    montantParCategorie: bilanAujourdhui,
    pourcentageParCategorie: pourcentageAujourdhui,
    patrimoine: {
      patrimoineBrut: patrimoineBrutAujourdhui,
      passif: passifAujourdhui,
      patrimoineNet: patrimoineNetAujourdhui,
      pourcentageDette: pourcentageDetteAujourdhui
    }
  });

  // Trier les dates historiques par ordre décroissant (plus récentes en premier)
  const datesTriees = Array.from(datesUniques).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Ajouter une entrée pour chaque date historique dans l'ordre trié
  datesTriees.forEach(dateHistorique => {
    const bilanPourDate: BilanParCategorie = {
      cash: 0,
      obligation: 0,
      action: 0,
      exotique: 0,
      immobilier: 0,
      dette: 0
    };

    positions.forEach(position => {
      const valeurPourDate = valeurs.find(v => v.date === dateHistorique && v.positionId === position.id);
      if (valeurPourDate) {
        bilanPourDate[position.categorie] += valeurPourDate.montant;
      }
    });

    // Calculer le patrimoine pour cette date
    const patrimoineBrutPourDate = Object.entries(bilanPourDate)
      .filter(([categorie]) => categorie !== 'dette')
      .reduce((sum, [, montant]) => sum + (montant > 0 ? montant : 0), 0);
    const valeursPourDate = Object.values(bilanPourDate);
    const passifPourDate = Math.abs(bilanPourDate.dette) + valeursPourDate.filter((montant, index) => montant < 0 && Object.keys(bilanPourDate)[index] !== 'dette').reduce((sum, montant) => sum + Math.abs(montant), 0);
    const patrimoineNetPourDate = patrimoineBrutPourDate - passifPourDate;
    const pourcentageDettePourDate = patrimoineBrutPourDate > 0 ? (passifPourDate / patrimoineBrutPourDate * 100) : 0;

    // Calculer les pourcentages pour cette date
    const totalSansDetteDate = Object.entries(bilanPourDate)
      .filter(([categorie]) => categorie !== 'dette')
      .reduce((sum, [, montant]) => sum + Math.abs(montant), 0);
      
    const pourcentageDate: PourcentageParCategorie = {
      cash: totalSansDetteDate > 0 ? (Math.abs(bilanPourDate.cash) / totalSansDetteDate * 100) : 0,
      obligation: totalSansDetteDate > 0 ? (Math.abs(bilanPourDate.obligation) / totalSansDetteDate * 100) : 0,
      action: totalSansDetteDate > 0 ? (Math.abs(bilanPourDate.action) / totalSansDetteDate * 100) : 0,
      exotique: totalSansDetteDate > 0 ? (Math.abs(bilanPourDate.exotique) / totalSansDetteDate * 100) : 0,
      immobilier: totalSansDetteDate > 0 ? (Math.abs(bilanPourDate.immobilier) / totalSansDetteDate * 100) : 0,
      dette: pourcentageDettePourDate
    };

    resultats.push({
      date: dateHistorique,
      montantParCategorie: bilanPourDate,
      pourcentageParCategorie: pourcentageDate,
      patrimoine: {
        patrimoineBrut: patrimoineBrutPourDate,
        passif: passifPourDate,
        patrimoineNet: patrimoineNetPourDate,
        pourcentageDette: pourcentageDettePourDate
      }
    });
  });

  return resultats;
} 