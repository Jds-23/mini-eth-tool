import {
	AbiConstructor,
	AbiError,
	AbiEvent,
	AbiFunction,
	type AbiItem,
	AbiParameters,
	type Hex,
} from "ox";
import type { Parameter } from "ox/AbiParameters";
import {
	constructorSignatureRegex,
	errorSignatureRegex,
	eventSignatureRegex,
	functionSignatureRegex,
	isTupleRegex,
} from "./regex";

// better fixes than 'as'
export function from(abiItem: string): from.ReturnType {
	if (isTupleRegex.test(abiItem)) {
		return AbiParameters.from(abiItem)[0] as Extract<
			Parameter,
			{ components: readonly Parameter[] }
		>;
	}
	if (errorSignatureRegex.test(abiItem)) {
		return AbiError.from(abiItem) as AbiError.AbiError;
	}
	if (eventSignatureRegex.test(abiItem)) {
		return AbiEvent.from(abiItem) as AbiEvent.AbiEvent;
	}
	if (functionSignatureRegex.test(abiItem)) {
		return AbiFunction.from(abiItem) as AbiFunction.AbiFunction;
	}
	// if (structSignatureRegex.test(abiItem)) {
	//     return AbiStruct.from(abiItem)
	// }
	if (constructorSignatureRegex.test(abiItem)) {
		return AbiConstructor.from(abiItem) as AbiConstructor.AbiConstructor;
	}
	return AbiFunction.from(
		`function ${abiItem}` as string,
	) as AbiFunction.AbiFunction;
}

export declare namespace from {
	type Options = {
		prepare?: boolean;
	};

	type ReturnType =
		| AbiEvent.AbiEvent
		| AbiError.AbiError
		| Extract<Parameter, { components: readonly Parameter[] }>
		| AbiFunction.AbiFunction
		| AbiConstructor.AbiConstructor;
}

export function fromAbi(
	abi: readonly AbiItem.AbiItem[] | Record<string, unknown>,
	identifier?: string,
): from.ReturnType | null {
	const items = Array.isArray(abi) ? abi : [abi as AbiItem.AbiItem];
	if (!items.length) return null;

	if (identifier) {
		try {
			return AbiFunction.fromAbi(
				items as readonly AbiFunction.AbiFunction[],
				identifier as Hex.Hex,
			) as from.ReturnType;
		} catch {
			return null;
		}
	}

	const first = items.find(
		(i) =>
			i &&
			typeof i === "object" &&
			"type" in i &&
			["function", "event", "error", "constructor"].includes(i.type),
	) as AbiItem.AbiItem | undefined;
	return first ? (from(JSON.stringify(first)) as from.ReturnType) : null;
}

export function getParameter(abiItem: from.ReturnType) {
	if ("type" in abiItem && abiItem.type === "function") {
		return abiItem.inputs;
	}
	if ("type" in abiItem && abiItem.type === "event") {
		return abiItem.inputs;
	}
	if ("type" in abiItem && abiItem.type === "error") {
		return abiItem.inputs;
	}
	if ("type" in abiItem && abiItem.type === "constructor") {
		return abiItem.inputs;
	}
	// if ("type" in abiItem && abiItem.type === "struct") {
	//     return abiItem.properties
	// }
	if ("components" in abiItem && abiItem.components.length > 0) {
		return abiItem.components;
	}
	return [];
}

export function decode(
	abiItem: from.ReturnType,
	data: Hex.Hex | { data?: Hex.Hex; topics: readonly Hex.Hex[] },
) {
	if ("type" in abiItem && abiItem.type === "function") {
		if (typeof data !== "string") {
			throw new Error("Function decoding requires topics and data object");
		}
		const res = AbiFunction.decodeData(abiItem, data) ?? [];
		return Array.isArray(res) ? res : [res];
	}
	if ("type" in abiItem && abiItem.type === "event") {
		if (typeof data === "string")
			throw new Error("Event decoding requires topics and data object");
		return AbiEvent.decode(abiItem, data);
	}
	if ("type" in abiItem && abiItem.type === "error") {
		if (typeof data !== "string") {
			throw new Error("Error decoding requires topics and data object");
		}
		const res = AbiError.decode(abiItem, data) ?? [];
		return Array.isArray(res) ? res : [res];
	}
        if ("type" in abiItem && abiItem.type === "constructor") {
                if (typeof data === "string" || !("bytecode" in data)) {
                        throw new Error(
                                "Constructor decoding requires { bytecode, data } object",
                        );
                }
                const res =
                        AbiConstructor.decode(abiItem, {
                                bytecode: (data as { bytecode: Hex.Hex }).bytecode,
                                data: (data as { data: Hex.Hex }).data ?? "0x",
                        }) ?? [];
                return Array.isArray(res) ? res : [res];
        }
	if ("components" in abiItem && abiItem.components.length > 0) {
		// if (options.packed) {
		//     const res = AbiParameters.d(abiItem.components, data) ?? [];
		//     return Array.isArray(res) ? res : [res];
		// }
		if (typeof data !== "string") {
			throw new Error("Struct decoding requires topics and data object");
		}
		const res = AbiParameters.decode(abiItem.components, data) ?? [];
		return Array.isArray(res) ? res : [res];
	}
	return [];
}

export function encode(
	abiItem: from.ReturnType,
	args: string[],
	options: { bytecode?: Hex.Hex; packed?: boolean } = { packed: false },
) {
	if ("type" in abiItem && abiItem.type === "function") {
		return AbiFunction.encodeData(abiItem, args);
	}
	if ("type" in abiItem && abiItem.type === "event") {
		return AbiEvent.encode(abiItem, args);
	}
	if ("type" in abiItem && abiItem.type === "error") {
		return AbiError.encode(abiItem, args);
	}
	if ("type" in abiItem && abiItem.type === "constructor") {
		return AbiConstructor.encode(abiItem, {
			args,
			bytecode: options.bytecode ?? "0x",
		});
	}
	if ("components" in abiItem && abiItem.components.length > 0) {
		if (options.packed) {
			return AbiParameters.encodePacked(
				abiItem.components.map((c) => c.type),
				args,
			);
		}
		return AbiParameters.encode(abiItem.components, args);
	}
	return null;
}
