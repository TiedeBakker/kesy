// kesy/app/invoermodule/parameter-invoer/_types/parameter-set-types.ts
export interface ParameterSet {
  id: string;
  label: string;
}

export interface ParameterSetItem {
  id: string; // Relatie-ID (parameter_set_parameters.id)
  parameterSetId: string;
  parameterId: string;
  volgnr: number;
  isMeetwaarde: boolean;
  
  // Extra meegeleverde gegevens uit de join met parameters:
  parameterLabel?: string;
  parameterCode?: string;
  dataType?: string;
  unit?: string;
}

// Invoer-item voor de frontend invullijst
export interface ParameterInvoerItem {
  parameterId: string;
  parameterLabel: string;
  parameterCode: string;
  dataType: string;
  unit?: string | null;
  volgnr: number;
  isMeetwaarde: boolean;
  ingevoerdeWaarde: string;
  laatstBekendeWaarde?: string | null;
  laatstBekendeDatum?: string | null;
  isExtraParameter?: boolean; // True als handmatig toegevoegd buiten de set
}