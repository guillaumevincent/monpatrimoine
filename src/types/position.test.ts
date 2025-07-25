import { describe, it, expect } from 'vitest';
import type { Position, Categorie, ValeurPosition } from './position';
import { calculerLeBilan } from './position';

describe('Position Types', () => {
  describe('Position', () => {
    it('should create a valid Position with all required fields', () => {
      const position: Position = {
        id: 'pos-1',
        label: 'Actions Apple',
        categorie: 'action',
        active: true
      };

      expect(position.id).toBe('pos-1');
      expect(position.label).toBe('Actions Apple');
      expect(position.categorie).toBe('action');
      expect(position.active).toBe(true);
    });

    it('should create an inactive Position', () => {
      const position: Position = {
        id: 'pos-2',
        label: 'Ancien Compte',
        categorie: 'cash',
        active: false
      };

      expect(position.active).toBe(false);
    });
  });

  describe('ValeurPosition', () => {
    it('should create a valid ValeurPosition object', () => {
      const valeur: ValeurPosition = {
        date: '2024-01-15',
        positionId: 'pos-1',
        montant: 150050
      };

      expect(valeur.date).toBe('2024-01-15');
      expect(valeur.positionId).toBe('pos-1');
      expect(valeur.montant).toBe(150050);
    });
  });

  describe('Categorie', () => {
    it('should accept all valid categories', () => {
      const categories: Categorie[] = [
        'cash',
        'obligation',
        'action',
        'exotique',
        'immobilier',
        'dette'
      ];

      categories.forEach(categorie => {
        expect(typeof categorie).toBe('string');
        expect(['cash', 'obligation', 'action', 'exotique', 'immobilier', 'dette']).toContain(categorie);
      });
    });
  });

  describe('calculerLeBilan', () => {
    it('should return zero values for all categories when no positions provided', () => {
      const bilan = calculerLeBilan([], []);

      expect(bilan).toBeInstanceOf(Array);
      expect(bilan).toHaveLength(1);
      
      const premierBilan = bilan[0];
      expect(premierBilan.date).toBeTruthy();
      expect(typeof premierBilan.date).toBe('string');
      
      // Vérifier que toutes les catégories sont à zéro
      expect(premierBilan.montantParCategorie.cash).toBe(0);
      expect(premierBilan.montantParCategorie.obligation).toBe(0);
      expect(premierBilan.montantParCategorie.action).toBe(0);
      expect(premierBilan.montantParCategorie.exotique).toBe(0);
      expect(premierBilan.montantParCategorie.immobilier).toBe(0);
      expect(premierBilan.montantParCategorie.dette).toBe(0);
      
      // Vérifier que tous les pourcentages sont à zéro
      expect(premierBilan.pourcentageParCategorie.cash).toBe(0);
      expect(premierBilan.pourcentageParCategorie.obligation).toBe(0);
      expect(premierBilan.pourcentageParCategorie.action).toBe(0);
      expect(premierBilan.pourcentageParCategorie.exotique).toBe(0);
      expect(premierBilan.pourcentageParCategorie.immobilier).toBe(0);
      expect(premierBilan.pourcentageParCategorie.dette).toBe(0);
      
      // Vérifier le patrimoine
      expect(premierBilan.patrimoine.patrimoineBrut).toBe(0);
      expect(premierBilan.patrimoine.passif).toBe(0);
      expect(premierBilan.patrimoine.patrimoineNet).toBe(0);
      expect(premierBilan.patrimoine.pourcentageDette).toBe(0);
    });

    it('should calculate bilan with single cash position', () => {
      const hier = new Date();
      hier.setDate(hier.getDate() - 1);
      
      const positions: Position[] = [
        {
          id: 'pos-1',
          label: 'Compte Courant',
          categorie: 'cash',
          active: true
        }
      ];

      const valeurs: ValeurPosition[] = [
        {
          date: hier.toISOString(),
          positionId: 'pos-1',
          montant: 500000
        }
      ];

      const bilan = calculerLeBilan(positions, valeurs);

      expect(bilan).toHaveLength(2);
      
      // Premier élément : aujourd'hui (avec dernières valeurs)
      expect(bilan[0].montantParCategorie.cash).toBe(500000);
      expect(bilan[0].montantParCategorie.obligation).toBe(0);
      expect(bilan[0].montantParCategorie.action).toBe(0);
      expect(bilan[0].montantParCategorie.exotique).toBe(0);
      expect(bilan[0].montantParCategorie.immobilier).toBe(0);
      expect(bilan[0].montantParCategorie.dette).toBe(0);
      
      // Deuxième élément : hier
      expect(bilan[1].date).toBe(hier.toISOString());
      expect(bilan[1].montantParCategorie.cash).toBe(500000);
      expect(bilan[1].montantParCategorie.obligation).toBe(0);
      expect(bilan[1].montantParCategorie.action).toBe(0);
      expect(bilan[1].montantParCategorie.exotique).toBe(0);
      expect(bilan[1].montantParCategorie.immobilier).toBe(0);
      expect(bilan[1].montantParCategorie.dette).toBe(0);
    });

    it('should calculate bilan with single cash position having multiple historical entries', () => {
      const ilYaDeuxJours = new Date();
      ilYaDeuxJours.setDate(ilYaDeuxJours.getDate() - 2);
      
      const hier = new Date();
      hier.setDate(hier.getDate() - 1);
      
      const positions: Position[] = [
        {
          id: 'pos-1',
          label: 'Compte Courant',
          categorie: 'cash',
          active: true
        }
      ];

      const valeurs: ValeurPosition[] = [
        {
          date: ilYaDeuxJours.toISOString(),
          positionId: 'pos-1',
          montant: 100000
        },
        {
          date: hier.toISOString(),
          positionId: 'pos-1',
          montant: 500000
        }
      ];

      const bilan = calculerLeBilan(positions, valeurs);

      expect(bilan).toHaveLength(3);
      
      // Premier élément : aujourd'hui (avec dernière valeur = 500000)
      expect(bilan[0].montantParCategorie.cash).toBe(500000);
      
      // Deuxième élément : hier (500000) - plus récent des historiques
      const bilanHier = bilan.find(b => b.date === hier.toISOString());
      expect(bilanHier?.montantParCategorie.cash).toBe(500000);
      
      // Troisième élément : il y a deux jours (100000) - plus ancien des historiques
      const bilanIlYaDeuxJours = bilan.find(b => b.date === ilYaDeuxJours.toISOString());
      expect(bilanIlYaDeuxJours?.montantParCategorie.cash).toBe(100000);
    });

    it('should handle inactive positions correctly', () => {
      const positions: Position[] = [
        {
          id: 'pos-1',
          label: 'Compte Actif',
          categorie: 'cash',
          active: true
        },
        {
          id: 'pos-2',
          label: 'Compte Fermé',
          categorie: 'cash',
          active: false
        }
      ];

      const valeurs: ValeurPosition[] = [
        {
          date: new Date().toISOString(),
          positionId: 'pos-1',
          montant: 300000
        },
        {
          date: new Date().toISOString(),
          positionId: 'pos-2',
          montant: 200000
        }
      ];

      const bilan = calculerLeBilan(positions, valeurs);
      
      // Les positions inactives sont toujours incluses dans le calcul
      expect(bilan[0].montantParCategorie.cash).toBe(500000);
    });

    it('should calculate bilan with multiple categories', () => {
      const positions: Position[] = [
        {
          id: 'pos-1',
          label: 'Compte Courant',
          categorie: 'cash',
          active: true
        },
        {
          id: 'pos-2',
          label: 'Actions Apple',
          categorie: 'action',
          active: true
        },
        {
          id: 'pos-3',
          label: 'Appartement',
          categorie: 'immobilier',
          active: true
        }
      ];

      const today = new Date().toISOString();
      const valeurs: ValeurPosition[] = [
        {
          date: today,
          positionId: 'pos-1',
          montant: 500000
        },
        {
          date: today,
          positionId: 'pos-2',
          montant: 1000000
        },
        {
          date: today,
          positionId: 'pos-3',
          montant: 30000000
        }
      ];

      const bilan = calculerLeBilan(positions, valeurs);
      
      expect(bilan).toHaveLength(2);
      expect(bilan[0].montantParCategorie.cash).toBe(500000);
      expect(bilan[0].montantParCategorie.action).toBe(1000000);
      expect(bilan[0].montantParCategorie.immobilier).toBe(30000000);
      expect(bilan[0].montantParCategorie.obligation).toBe(0);
      expect(bilan[0].montantParCategorie.exotique).toBe(0);
      expect(bilan[0].montantParCategorie.dette).toBe(0);
    });

    it('should calculate patrimoine correctly with mixed positive and negative values', () => {
      const positions: Position[] = [
        {
          id: 'pos-1',
          label: 'Compte Courant',
          categorie: 'cash',
          active: true
        },
        {
          id: 'pos-2',
          label: 'Actions Apple',
          categorie: 'action',
          active: true
        },
        {
          id: 'pos-3',
          label: 'Prêt Immobilier',
          categorie: 'dette',
          active: true
        }
      ];

      const today = new Date().toISOString();
      const valeurs: ValeurPosition[] = [
        {
          date: today,
          positionId: 'pos-1',
          montant: 500000  // 5000€ en cash
        },
        {
          date: today,
          positionId: 'pos-2',
          montant: 1000000  // 10000€ en actions
        },
        {
          date: today,
          positionId: 'pos-3',
          montant: -30000000  // -300000€ de dette
        }
      ];

      const bilan = calculerLeBilan(positions, valeurs);
      
      expect(bilan).toHaveLength(2);
      
      // Vérifier les calculs de patrimoine
      const patrimoine = bilan[0].patrimoine;
      expect(patrimoine.patrimoineBrut).toBe(1500000); // 5000 + 10000 = 15000€
      expect(patrimoine.passif).toBe(30000000); // 300000€ de dette
      expect(patrimoine.patrimoineNet).toBe(-28500000); // 15000 - 300000 = -285000€
      expect(patrimoine.pourcentageDette).toBeCloseTo(2000, 1); // (300000 / 15000) * 100 = 2000%
    });
  });
});
