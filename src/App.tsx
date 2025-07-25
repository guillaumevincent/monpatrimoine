import { useState } from "react";
import type { Position, Categorie, ValeurPosition } from "./types/position";
import { calculerLeBilan } from "./types/position";
import useLocalStorage from "./hooks/useLocalStorage";

const getCategorieIcon = (categorie: Categorie): string => {
  const icons = {
    cash: "💵",
    obligation: "📊",
    action: "📈",
    exotique: "✨",
    immobilier: "🏠",
    dette: "📉",
  };
  return icons[categorie];
};

// Génère un ID unique pour les positions
const generateId = (): string => {
  return "pos-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
};

function App() {
  const [positions, setPositions] = useLocalStorage<Position[]>(
    "dringg-positions",
    []
  );
  const [valeurs, setValeurs] = useLocalStorage<ValeurPosition[]>(
    "dringg-valeurs",
    []
  );

  const [formData, setFormData] = useState({
    label: "",
    categorie: "cash" as Categorie,
  });

  const [showBilanForm, setShowBilanForm] = useState(false);
  const [bilanDate, setBilanDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [bilanMontants, setBilanMontants] = useState<{
    [positionId: string]: string;
  }>({});
  const [showModalPosition, setShowModalPosition] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [activeTab, setActiveTab] = useState<"montants" | "pourcentages">(
    "montants"
  );

  const handleSubmitPosition = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.label) return;

    if (editingPosition) {
      // Mode édition
      setPositions(
        positions.map((pos) =>
          pos.id === editingPosition.id
            ? { ...pos, label: formData.label, categorie: formData.categorie }
            : pos
        )
      );
    } else {
      // Mode création
      const nouvellePosition: Position = {
        id: generateId(),
        label: formData.label,
        categorie: formData.categorie,
        active: true,
      };
      setPositions([...positions, nouvellePosition]);
    }

    setFormData({
      label: "",
      categorie: "cash",
    });
    setShowModalPosition(false);
    setEditingPosition(null);
  };

  const handleEditPosition = (position: Position) => {
    setEditingPosition(position);
    setFormData({
      label: position.label,
      categorie: position.categorie,
    });
    setShowModalPosition(true);
  };

  const handleCancelModal = () => {
    setShowModalPosition(false);
    setEditingPosition(null);
    setFormData({
      label: "",
      categorie: "cash",
    });
  };

  const handleEditBilan = (date: string) => {
    const dateForInput = new Date(date).toISOString().split("T")[0];
    setBilanDate(dateForInput);

    // Pré-remplir avec les valeurs existantes pour cette date
    const valeursExistantes = valeurs.filter((v) => v.date === date);
    const montantsExistants: { [positionId: string]: string } = {};
    valeursExistantes.forEach((valeur) => {
      montantsExistants[valeur.positionId] = (valeur.montant / 100).toString();
    });
    setBilanMontants(montantsExistants);

    setShowBilanForm(true);
  };

  const handleDeleteBilan = (date: string) => {
    const dateFormatted = new Date(date).toLocaleDateString("fr-FR");
    if (
      confirm(
        `Voulez-vous vraiment supprimer le bilan du ${dateFormatted} ? Cette action ne peut pas être annulée.`
      )
    ) {
      // Supprimer toutes les valeurs pour cette date
      setValeurs(valeurs.filter((v) => v.date !== date));
    }
  };

  const togglePositionActive = (positionId: string) => {
    setPositions(
      positions.map((pos) =>
        pos.id === positionId ? { ...pos, active: !pos.active } : pos
      )
    );
  };

  const deletePosition = (positionId: string) => {
    const position = positions.find((p) => p.id === positionId);
    if (!position) return;

    if (
      confirm(
        `Voulez-vous vraiment supprimer la position "${position.label}" ? Cette action supprimera aussi tout son historique et ne peut pas être annulée.`
      )
    ) {
      // Supprimer la position
      setPositions(positions.filter((p) => p.id !== positionId));
      // Supprimer toutes les valeurs associées à cette position
      setValeurs(valeurs.filter((v) => v.positionId !== positionId));
    }
  };

  const handleFaireLeBilan = () => {
    const today = new Date().toISOString().split("T")[0];
    const todayISO = new Date(today).toISOString();

    // Vérifier s'il y a déjà des valeurs pour aujourd'hui
    const valeursExistantes = valeurs.filter((v) => v.date === todayISO);

    setShowBilanForm(true);
    setBilanDate(today);

    // Pré-remplir le formulaire avec les valeurs existantes
    const montantsExistants: { [positionId: string]: string } = {};
    valeursExistantes.forEach((valeur) => {
      montantsExistants[valeur.positionId] = (valeur.montant / 100).toString();
    });
    setBilanMontants(montantsExistants);
  };

  const handleSubmitBilan = (e: React.FormEvent) => {
    e.preventDefault();

    const dateISO = new Date(bilanDate).toISOString();

    // Supprimer toutes les valeurs existantes pour cette date
    const valeursFiltered = valeurs.filter((v) => v.date !== dateISO);

    const nouvellesValeurs: ValeurPosition[] = [];

    positions.forEach((position) => {
      const montantStr = bilanMontants[position.id];
      if (montantStr && montantStr.trim() !== "") {
        const montant = parseFloat(montantStr) * 100; // Convertir en centimes
        if (!isNaN(montant)) {
          nouvellesValeurs.push({
            date: dateISO,
            positionId: position.id,
            montant: montant,
          });
        }
      }
    });

    // Sauvegarder les nouvelles valeurs
    setValeurs([...valeursFiltered, ...nouvellesValeurs]);

    setShowBilanForm(false);
    setBilanMontants({});
  };

  // Grouper les valeurs par date pour l'affichage
  const valeursGroupees = valeurs.reduce(
    (acc, valeur) => {
      const dateKey = valeur.date;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(valeur);
      return acc;
    },
    {} as { [date: string]: ValeurPosition[] }
  );

  const bilan = calculerLeBilan(positions, valeurs);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-600 mb-8">
          Votre patrimoine
        </h1>

        {/* Affichage du bilan */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          {bilan.length > 0 &&
          bilan[0].montantParCategorie &&
          Object.values(bilan[0].montantParCategorie).some((v) => v !== 0) ? (
            <div className="space-y-4">
              {/* Onglets */}
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("montants")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "montants"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Montants
                </button>
                <button
                  onClick={() => setActiveTab("pourcentages")}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "pourcentages"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Pourcentages
                </button>
              </div>

              {/* Contenu des onglets */}
              {bilan.slice(0, 1).map((bilanDate, index) => (
                <div key={index}>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {Object.entries(bilanDate.montantParCategorie).map(
                      ([categorie, montant]) => (
                        <div key={categorie} className="text-center">
                          <div className="text-sm text-gray-600 flex items-center justify-center gap-1 mb-1">
                            <span>
                              {getCategorieIcon(categorie as Categorie)}
                            </span>
                            <span className="capitalize">{categorie}</span>
                          </div>

                          {activeTab === "montants" ? (
                            <div
                              className={`font-semibold text-lg ${montant >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {(montant / 100).toLocaleString("fr-FR", {
                                style: "currency",
                                currency: "EUR",
                              })}
                            </div>
                          ) : (
                            <div className="font-semibold text-lg text-blue-600">
                              {bilanDate.pourcentageParCategorie[
                                categorie as keyof typeof bilanDate.pourcentageParCategorie
                              ].toFixed(1)}
                              %
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>

                  {/* Résumé du patrimoine */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-semibold mb-3 text-gray-800">
                      Résumé du Patrimoine
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center bg-green-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600 mb-1">
                          Patrimoine Brut
                        </div>
                        <div className="font-semibold text-green-600">
                          {(
                            bilanDate.patrimoine.patrimoineBrut / 100
                          ).toLocaleString("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          })}
                        </div>
                      </div>
                      <div className="text-center bg-blue-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600 mb-1">
                          Patrimoine Net
                        </div>
                        <div
                          className={`font-semibold ${bilanDate.patrimoine.patrimoineNet >= 0 ? "text-blue-600" : "text-red-600"}`}
                        >
                          {(
                            bilanDate.patrimoine.patrimoineNet / 100
                          ).toLocaleString("fr-FR", {
                            style: "currency",
                            currency: "EUR",
                          })}
                        </div>
                      </div>
                      <div className="text-center bg-red-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600 mb-1">Passif</div>
                        <div className="font-semibold text-red-600">
                          {(bilanDate.patrimoine.passif / 100).toLocaleString(
                            "fr-FR",
                            {
                              style: "currency",
                              currency: "EUR",
                            }
                          )}
                        </div>
                      </div>
                      <div className="text-center bg-yellow-50 rounded-lg p-3">
                        <div className="text-sm text-gray-600 mb-1">
                          % de Dette
                        </div>
                        <div className="font-semibold text-yellow-600">
                          {bilanDate.patrimoine.pourcentageDette.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Aucun bilan effectué</p>
          )}
        </div>
        {/* Liste des positions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">
                Positions ({positions.length})
              </h2>
              <button
                onClick={() => setShowModalPosition(true)}
                className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors text-lg font-bold"
                title="Ajouter une position"
              >
                +
              </button>
            </div>
            <button
              onClick={handleFaireLeBilan}
              disabled={positions.length === 0}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Faire le Bilan
            </button>
          </div>

          {positions.length === 0 ? (
            <p className="text-gray-500">Aucune position ajoutée</p>
          ) : (
            <div className="space-y-3">
              {positions.map((position) => {
                const derniereValeur = valeurs
                  .filter((v) => v.positionId === position.id)
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )[0];

                return (
                  <div
                    key={position.id}
                    className={`border rounded-lg p-4 ${position.active ? "border-gray-200" : "border-gray-300 bg-gray-50"}`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                          <span>{getCategorieIcon(position.categorie)}</span>
                          <span className="capitalize">
                            {position.categorie}
                          </span>
                        </span>
                        <h3
                          className={`font-semibold ${position.active ? "text-gray-900" : "text-gray-500"}`}
                        >
                          {position.label}
                        </h3>
                        {!position.active && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        {derniereValeur && (
                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              Dernière valeur:
                            </div>
                            <div className="font-semibold">
                              {(derniereValeur.montant / 100).toLocaleString(
                                "fr-FR",
                                {
                                  style: "currency",
                                  currency: "EUR",
                                }
                              )}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(derniereValeur.date).toLocaleDateString(
                                "fr-FR"
                              )}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => togglePositionActive(position.id)}
                          className={`px-3 py-1 rounded text-sm ${
                            position.active
                              ? "bg-red-100 text-red-600 hover:bg-red-200"
                              : "bg-green-100 text-green-600 hover:bg-green-200"
                          }`}
                        >
                          {position.active ? "Désactiver" : "Réactiver"}
                        </button>
                        <button
                          onClick={() => handleEditPosition(position)}
                          className="bg-white border border-blue-500 text-blue-500 px-2 py-1 rounded text-sm hover:bg-blue-50"
                          title="Modifier la position"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deletePosition(position.id)}
                          className="bg-white border border-red-500 text-red-500 px-2 py-1 rounded text-sm hover:bg-red-50"
                          title="Supprimer la position"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal de bilan */}
        {showBilanForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">
                  {valeurs.some(
                    (v) => v.date === new Date(bilanDate).toISOString()
                  )
                    ? "Modifier le Bilan"
                    : "Faire le Bilan"}
                </h2>
                <button
                  onClick={() => setShowBilanForm(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
              </div>

              {valeurs.some(
                (v) => v.date === new Date(bilanDate).toISOString()
              ) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-blue-800 text-sm">
                    ℹ️ Un bilan existe déjà pour cette date. Vous pouvez
                    modifier les montants ci-dessous.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmitBilan} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date du bilan
                  </label>
                  <input
                    type="date"
                    value={bilanDate}
                    onChange={(e) => {
                      setBilanDate(e.target.value);
                      // When date changes, load existing values for the new date
                      const newDateISO = new Date(e.target.value).toISOString();
                      const valeursExistantes = valeurs.filter(
                        (v) => v.date === newDateISO
                      );
                      const montantsExistants: {
                        [positionId: string]: string;
                      } = {};
                      valeursExistantes.forEach((valeur) => {
                        montantsExistants[valeur.positionId] = (
                          valeur.montant / 100
                        ).toString();
                      });
                      setBilanMontants(montantsExistants);
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="font-medium">
                    Montants pour chaque position:
                  </h3>
                  {positions.map((position) => (
                    <div key={position.id} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-1/2">
                        <span>{getCategorieIcon(position.categorie)}</span>
                        <span
                          className={
                            position.active ? "text-gray-900" : "text-gray-500"
                          }
                        >
                          {position.label}
                        </span>
                        {!position.active && (
                          <span className="text-xs bg-red-100 text-red-600 px-1 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Montant (€)"
                        value={bilanMontants[position.id] || ""}
                        onChange={(e) =>
                          setBilanMontants({
                            ...bilanMontants,
                            [position.id]: e.target.value,
                          })
                        }
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                  >
                    {valeurs.some(
                      (v) => v.date === new Date(bilanDate).toISOString()
                    )
                      ? "Mettre à jour le Bilan"
                      : "Sauvegarder le Bilan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBilanForm(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Historique des bilans */}
        {Object.keys(valeursGroupees).length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              Historique des Bilans
            </h2>

            <div className="space-y-6">
              {Object.entries(valeursGroupees)
                .sort(
                  ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
                )
                .map(([date]) => (
                  <div
                    key={date}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-lg">
                        {new Date(date).toLocaleDateString("fr-FR")}
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditBilan(date)}
                          className="bg-white border border-blue-500 text-blue-500 px-3 py-1 rounded text-sm hover:bg-blue-50"
                          title="Modifier ce bilan"
                        >
                          ✏️ Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteBilan(date)}
                          className="bg-white border border-red-500 text-red-500 px-3 py-1 rounded text-sm hover:bg-red-50"
                          title="Supprimer ce bilan"
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Modal d'ajout de position */}
        {showModalPosition && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">
                  {editingPosition
                    ? "Modifier une Position"
                    : "Ajouter une Position"}
                </h2>
                <button
                  onClick={handleCancelModal}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmitPosition} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) =>
                      setFormData({ ...formData, label: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Compte Courant"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={formData.categorie}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        categorie: e.target.value as Categorie,
                      })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="obligation">📊 Obligation</option>
                    <option value="action">📈 Action</option>
                    <option value="exotique">✨ Exotique</option>
                    <option value="immobilier">🏠 Immobilier</option>
                    <option value="dette">📉 Dette</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {editingPosition
                      ? "Mettre à jour la Position"
                      : "Ajouter Position"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelModal}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
