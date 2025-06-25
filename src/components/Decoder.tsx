import { zodResolver } from "@hookform/resolvers/zod";
import { AbiError, AbiFunction, AbiParameters } from "ox";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
	type SignatureItem,
	useSignatureLookup,
} from "../lib/hooks/useSignatureLookup";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const sigSchema = z.string().min(1, "Required");
const hexSchema = z.string().min(1, "Required");

export default function Decoder() {
	const sigForm = useForm({
		resolver: zodResolver(z.object({ sig: sigSchema, hex: hexSchema })),
		defaultValues: { sig: "", hex: "" },
		mode: "onChange",
	});
	const sig = useWatch({ control: sigForm.control, name: "sig" });
	const hex = useWatch({ control: sigForm.control, name: "hex" });
	const [sigError, setSigError] = useState<string | null>(null);
	const [decodeError, setDecodeError] = useState<string | null>(null);
	const [decoded, setDecoded] = useState<any[] | null>(null);
	const [usedSig] = useState<string | null>(null);

	// Extract function selector (first 10 chars)
	let selector = "";
	if (hex && /^0x[0-9a-fA-F]+$/.test(hex)) {
		if (hex.length >= 10) selector = hex.slice(0, 10);
	}

	// Only lookup if no signature entered and selector present
	const shouldLookup = !sig && selector.length === 10;
	const { data: sigData, isLoading: isLookupLoading } = useSignatureLookup(
		{ functionHashes: selector ? [selector] : [] },
		{ enabled: shouldLookup } as any,
	);

	// If user picks a fetched signature, set it in the form
	function handlePickSignature(s: string) {
		sigForm.setValue("sig", s);
	}

	// Determine which signature to use for decoding
	const effectiveSig =
		sig ||
		(usedSig
			? usedSig
			: sigData &&
				sigData.result.function &&
				Object.values(sigData.result.function).flat()[0]?.name) ||
		"";

	// Parse signature (function, error, or tuple)
	const abiObj = useMemo<any | null>(() => {
		setSigError(null);
		if (!effectiveSig) return null;
		let prefix = "";
		let rest = effectiveSig.trim();
		const match = rest.match(/^(function|error)\s+/i);
		if (match) {
			prefix = match[1].toLowerCase();
			rest = rest.slice(match[0].length);
		}
		// Tuple mode
		const tupleMatch = rest.match(/^\(([^)]*)\)$/);
		if (!prefix && tupleMatch) {
			try {
				let types = tupleMatch[1]
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean);
				types = types.map((t) =>
					t === "uint" ? "uint256" : t === "int" ? "int256" : t,
				);
				types = types.filter(
					(t) => t && typeof t === "string" && /^[a-zA-Z0-9_\[\]]+$/.test(t),
				);
				if (!types.length) throw new Error("No types found");
				const params = AbiParameters.from(types);
				if (
					!Array.isArray(params) ||
					!params.every(
						(p: any) => typeof p === "object" && typeof p.type === "string",
					)
				) {
					throw new Error("Invalid parameter types");
				}
				return { type: "tuple", params, types };
			} catch (e: any) {
				setSigError(e.message || "Invalid parameter tuple");
				return null;
			}
		}
		try {
			if (prefix === "error") {
				const err = AbiError.from("error " + rest);
				if (err.type !== "error") throw new Error("Not an error signature");
				return err;
			} else {
				const fn = AbiFunction.from("function " + rest);
				if (fn.type !== "function") throw new Error("Not a function signature");
				return fn;
			}
		} catch (e: any) {
			setSigError(e.message || "Invalid signature");
			return null;
		}
	}, [effectiveSig]);

	// Param fields for display
	let paramFields: (any & { name: string })[] = [];
	if (abiObj) {
		if (abiObj.type === "tuple" && Array.isArray(abiObj.types)) {
			paramFields = abiObj.types.map((type: string, idx: number) => ({
				name: `arg${idx}`,
				type,
			}));
		} else if (Array.isArray(abiObj.inputs)) {
			paramFields = abiObj.inputs.map((input: any, idx: number) => ({
				...input,
				name: input.name || `arg${idx}`,
			}));
		}
	}

	// Decoding logic
	function handleDecode() {
		setDecodeError(null);
		setDecoded(null);
		if (!abiObj) return;
		// Ensure hex is a valid 0x-prefixed string
		const hexVal = (hex || "").trim();
		if (hexVal.length < 10) {
			setDecodeError(
				"Hex must be at least 10 characters (0x + 8 hex chars) for function selector",
			);
			return;
		}
		if (!/^0x[0-9a-fA-F]+$/.test(hexVal)) {
			setDecodeError("Hex must be a 0x-prefixed hex string");
			return;
		}
		const hexTyped = hexVal as `0x${string}`;
		try {
			let values: any[] = [];
			if (abiObj.type === "function") {
				values = AbiFunction.decodeData(abiObj, hexTyped) ?? [];
			} else if (abiObj.type === "error") {
				const res = AbiError.decode(abiObj, hexTyped);
				values = Array.isArray(res) ? res : [res];
			} else if (abiObj.type === "tuple") {
				const res = AbiParameters.decode(abiObj.params, hexTyped);
				values = Array.isArray(res) ? res : [res];
			}
			setDecoded(values ?? []);
		} catch (e: any) {
			setDecodeError(e.message || "Decoding error");
		}
	}

	return (
		<div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed max-w-lg border-black shadow flex flex-col gap-6">
			<h2 className="text-lg font-bold mb-2">EVM Decoder</h2>
			<Form {...sigForm}>
				<form
					className="flex flex-col gap-4"
					onSubmit={(e) => {
						e.preventDefault();
						handleDecode();
					}}
				>
					<FormField
						control={sigForm.control}
						name="hex"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input
										{...field}
										placeholder="Hex data to decode (0x...)"
										autoComplete="off"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					{/* Signature lookup UI */}
					{!sig && selector.length === 10 && (
						<>
							{isLookupLoading && (
								<div className="text-sm text-muted-foreground">
									Looking up possible signatures...
								</div>
							)}
							{sigData && sigData.result.function && (
								<div className="flex flex-col gap-2">
									<div className="text-xs text-muted-foreground">
										Possible signatures from selector:
									</div>
									{Object.values(sigData.result.function)
										.flat()
										.filter((item) => item && item.name)
										.map((item, idx) => (
											<button
												key={item!.name + idx}
												className="text-xs text-blue-600 underline text-left hover:text-blue-800"
												type="button"
												onClick={() => handlePickSignature(item!.name)}
											>
												{item!.name}
											</button>
										))}
								</div>
							)}
						</>
					)}
					<FormField
						control={sigForm.control}
						name="sig"
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Textarea
										{...field}
										placeholder="Signature: approve(address,uint) or (uint,address)"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button type="submit" className="w-fit">
						Decode
					</Button>
				</form>
			</Form>

			{decodeError && <div className="text-red-500 text-sm">{decodeError}</div>}
			{sigError && <div className="text-red-500 text-sm">{sigError}</div>}
			{decoded && paramFields.length > 0 && (
				<div className="flex flex-col gap-2">
					{paramFields.map((field, idx) => (
						<div key={field.name} className="flex gap-2 items-center">
							<span className="text-xs text-muted-foreground w-32">
								{field.name} ({field.type}):
							</span>
							<Input
								type="text"
								readOnly
								value={decoded[idx]?.toString?.() ?? ""}
								className="flex-1"
							/>
						</div>
					))}
				</div>
			)}
			{decoded && paramFields.length === 0 && (
				<div className="flex flex-col gap-2">
					{decoded.map((val, idx) => (
						<div key={idx} className="flex gap-2 items-center">
							<span className="text-xs text-muted-foreground w-32">
								arg{idx}:
							</span>
							<Input
								type="text"
								readOnly
								value={val?.toString?.() ?? ""}
								className="flex-1"
							/>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
