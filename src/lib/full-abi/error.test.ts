import { AbiError, type Hex } from "ox";
import { expect, test } from "vitest";
import { fullAbi } from "./index";

test("error", () => {
	const abi = "error BadTransfer(uint256 code)" as const;
	const abiItem = fullAbi.from(abi);
	const params = fullAbi.getParameter(abiItem);
	const encoded = fullAbi.encode(abiItem, ["1"]);
	const decoded = fullAbi.decode(abiItem, encoded ?? "0x");
	expect(abiItem.type).toBe("error");
	expect(params).toEqual([{ name: "code", type: "uint256" }]);
	expect(encoded).toBe(AbiError.encode(abiItem as AbiError.AbiError, ["1"]));
	expect(decoded).toEqual([1n]);
});

test("throws on invalid decode type", () => {
	const abiItem = fullAbi.from("error BadTransfer(uint256 code)");
	expect(() =>
		fullAbi.decode(abiItem, { data: "0x" } as unknown as Hex.Hex),
	).toThrow("Error decoding requires topics and data object");
});
