import { AbiConstructor } from "ox";
import { expect, test } from "vitest";
import { fullAbi } from "./index";

test("constructor", () => {
        const abi = "constructor(address owner, uint256 amount)" as const;
        const abiItem = fullAbi.from(abi);
        const params = fullAbi.getParameter(abiItem);
        const bytecode = "0x" as const;
        const encoded = fullAbi.encode(abiItem, [
                "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
                "123",
        ], { bytecode }) as `0x${string}`;
        const decoded = fullAbi.decode(abiItem, {
                bytecode,
                data: encoded,
        });
        expect(abiItem.type).toBe("constructor");
        expect(params).toEqual([
                { name: "owner", type: "address" },
                { name: "amount", type: "uint256" },
        ]);
        expect(encoded).toBe(
                AbiConstructor.encode(abiItem as AbiConstructor.AbiConstructor, {
                        bytecode,
                        args: ["0xd8da6bf26964af9d7eed9e03e53415d37aa96045", 123n],
                }),
        );
        expect(decoded).toEqual([
                "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
                123n,
        ]);
});
