import { buildQuickAddItems } from "./build-quick-add-items";
import { verwerkQuickAddBatch } from "../_actions/quick-add-actions";

async function runTest() {
    // 1. Genereer 2 test-items
    const items = buildQuickAddItems(
        {
            sourceId: "test_lokaal", // Plak hier even een ECHT object ID uit je database!
            relationId: "019faaca-2de4-731e-bef0-126c0b28d01b", // Plak hier een ECHT relatie ID
            pattern: "TestLOKAAL2-Kind {n}",
            startNumber: 1,
            step: 1,
            count: 4,
            zeroPadding: 2,
        },
        false
    );

    console.log("Items gegenereerd, starten met verwerken in DB...");

    // 2. Roep de server action direct aan
    const res = await verwerkQuickAddBatch({
        sourceId: "test_lokaal", // Plak hier even een ECHT object ID uit je database!
        relationId: "019faaca-2de4-731e-bef0-126c0b28d01b",
        items,
    });

    console.log("Resultaat van opslaan:", res);
}

runTest();