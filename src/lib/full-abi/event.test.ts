import { AbiParameters } from "ox";
import { expect, test } from "vitest";
import { fullAbi } from "./index";

test("event", () => {
	const abi =
		"event Transfer(address indexed from, address indexed to, uint256 value)" as const;
	const abiItem = fullAbi.from(abi);
	const params = fullAbi.getParameter(abiItem);
	const encoded = fullAbi.encode(abiItem, [
		"0x0000000000000000000000000000000000000001",
		"0x0000000000000000000000000000000000000002",
	]) as { topics: readonly `0x${string}`[] };
	const data = AbiParameters.encode([{ name: "value", type: "uint256" }], [1n]);
	const decoded = fullAbi.decode(abiItem, {
		data,
		topics: encoded.topics,
	}) as { from: string; to: string; value: bigint };
	expect(abiItem.type).toBe("event");
	expect(params.length).toBe(3);
	expect(encoded.topics.length).toBe(3);
	expect(decoded).toEqual({
		from: "0x0000000000000000000000000000000000000001",
		to: "0x0000000000000000000000000000000000000002",
		value: 1n,
	});
});
