// app/basismodule/page.tsx

import {
  haalObjectOp,
  haalObjectenBoomOp,
  haalAlleObjectenOp,
  haalRelatieTypenOp,
} from "@/core/db/repository";
import BasismoduleClient from "./components/BasismoduleClient";

interface PageProps {
  searchParams: Promise<{ selectedId?: string }>;
}

export default async function BasismodulePage({
  searchParams,
}: {
  searchParams: Promise<{ selectedId?: string; pageIngaand?: string; pageUitgaand?: string }>;
}) {
  const params = await searchParams;
  const selectedId = params.selectedId;
  const pageIngaand = parseInt(params.pageIngaand || "1", 10);
  const pageUitgaand = parseInt(params.pageUitgaand || "1", 10);

  // Data ophalen op de server
  const alleObjecten = await haalAlleObjectenOp();
  const relatieTypen = await haalRelatieTypenOp();
  const centraalObject = selectedId ? await haalObjectOp(selectedId) : null;
  const boomData = selectedId
    ? await haalObjectenBoomOp(selectedId, pageIngaand, pageUitgaand, 50)
    : { ingaand: [], uitgaand: [] };
  return (
    <BasismoduleClient
      alleObjecten={alleObjecten}
      relatieTypen={relatieTypen}
      centraalObject={centraalObject}
      boomData={boomData}
      selectedId={selectedId}
      pageIngaand={pageIngaand}
      pageUitgaand={pageUitgaand}
    />
  );
}