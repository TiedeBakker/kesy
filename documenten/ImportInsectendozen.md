Ik wil eenmalig een groot aantal objecten met relaties en parameterwaarden vanuit een cvs aan de Turso-database toevoegen (is_confidential = false)
Het gaat om de inhoud van een groot aantal insectendozen. De CSV-regels hebben de volgende structuur:

Insectendoos_label|Insectendoos_toelichting|AangegevenTaxon|aantal
01-01|Schenking H. Bosz; Carabidae 5|Carabus anatolicus|8
01-01|Schenking H. Bosz; Carabidae 5|Carabus albrechti okumurai|4
01-01|Schenking H. Bosz; Carabidae 5|Carabus awashimae|2
01-01|Schenking H. Bosz; Carabidae 5|Carabus rumelicus|1
01-01|Schenking H. Bosz; Carabidae 5|Carabus morio|5
01-01|Schenking H. Bosz; Carabidae 5|Carabus irmasanus|2
01-01|Schenking H. Bosz; Carabidae 5|Carabus torosus|1
01-01|Schenking H. Bosz; Carabidae 5|Paussus favieri|2
01-01|Schenking H. Bosz; Carabidae 5|Cychrus angustatus|2
01-01|Schenking H. Bosz; Carabidae 5|Cychrus cylindricollis|1

De eerste kolom bevat een aanduiding (label) voor een insectendoos. Als dit label nog niet in de objectentabel voorkomt moet een nieuw object worden aangemaak (als label voorkomt wordt het bestaande object met dat label gebruikt):
ID: komt straks terug als insectendoosID
Label: aangegeven aanduiding voorafgegaan door "Insectendoos" dus bij eerste wordt dit "Insectendoos: 01-01".
validFrom: aanmaakmoment
isConfidential: false
Deze insectendoos krijgt gelijk een paar relatie- en parameter-koppelingen:
- relatie met objecttype insectendoos als source (id van insectendoos:019fcd20-b442-755f-af50-9cdf9716990d); relatie: is objecttype: (id: 019fcdd3-721a-7512-b755-cddd67f43eb6)
- parameter Toelichting (heeft id: 019fc74c-cf8c-74ff-a3b6-b6d21c651a19) krijgt waarde uit de kolom "Insectendoos_toelichting"

Er moet voor elke regel een nieuw object voor het aangegeven taxon worden aangemaakt. Dit object krijgt zijn eigen id en als label: "Specimen groep: " + de tekst uit de kolom "AangegevenTaxon". validFrom is aanmaakmoment en isConfidential: false
Ook dit object krijgt gelijk een paar relatie- en parameter-koppelingen:
- een relatie met objecttype Specimengroep als source (id van specimengroep: 019fcd20-b56f-76ae-9bf0-f98a0354b7ca);  relatie: is objecttype: (id: 019fcdd3-721a-7512-b755-cddd67f43eb6)
- een relatie de insectendoos als source (id: insectendoosID); relatie is "zit in of op" (id: 019fad01-ca30-769d-8c9c-6fc70fa9db0a); het volgnummer is hier oplopend in de csv-volgorde.
- parameterwaarde voor aantal (id: 019fad6f-c149-7795-b3e5-751c8b2b7949) met als waarde het getal uit de kolom aantal
- parameterwaarde voor gegeven_Taxon_Naam (id) met als waarde de naam uit de kolom "AangegevenTaxon"