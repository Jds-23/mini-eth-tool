import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "./ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "./ui/form";
import { Input } from "./ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

const MAX_SAFE_INTEGER_FOR_BITWISE = 2147483647; // 2^31 - 1
// const MIN_SAFE_INTEGER_FOR_BITWISE = -2147483648; // -2^31

type OperandBase = "dec" | "hex" | "bin";

type Op =
	| "shiftLeft"
	| "shiftRight"
	| "add"
	| "sub"
	| "or"
	| "xor"
	| "and"
	| "mult"
	| "div"
	| "mod"
	| "not";

const operationsMap: Record<
	Op,
	{ name: string; fn: (a: number, b: number) => number; unary?: boolean }
> = {
	shiftLeft: { name: "Shift Left", fn: (a, b) => a << b },
	shiftRight: { name: "Shift Right", fn: (a, b) => a >> b },
	add: { name: "Add", fn: (a, b) => a + b },
	sub: { name: "Sub", fn: (a, b) => a - b },
	or: { name: "OR", fn: (a, b) => a | b },
	xor: { name: "XOR", fn: (a, b) => a ^ b },
	and: { name: "AND", fn: (a, b) => a & b },
	mult: { name: "Mult", fn: (a, b) => a * b },
	div: { name: "Div", fn: (a, b) => a / b },
	mod: { name: "Modulo", fn: (a, b) => a % b },
	not: { name: "NOT", fn: (a) => ~a, unary: true },
};

const baseRegex: Record<OperandBase, RegExp> = {
	dec: /^\d*$/,
	hex: /^[0-9a-fA-F]*$/,
	bin: /^[01]*$/,
};

type FormValues = {
	binary?: string;
	decimal?: string;
	hex?: string;
	operand?: string;
};

const Calculator = () => {
	const [operandBase, setOperandBase] = useState<OperandBase>("dec");

	// Dynamic schema based on operandBase
	const formSchema = useMemo(
		() =>
			z.object({
				binary: z
					.string()
					.regex(baseRegex.bin, { message: "Binary must be 0 or 1 only" })
					.optional()
					.or(z.literal("")),
				decimal: z
					.string()
					.regex(baseRegex.dec, { message: "Decimal must be digits only" })
					.optional()
					.or(z.literal("")),
				hex: z
					.string()
					.regex(baseRegex.hex, { message: "Hex must be 0-9 or A-F" })
					.optional()
					.or(z.literal("")),
				operand: z
					.string()
					.refine((val) => baseRegex[operandBase].test(val), {
						message: `Invalid operand for selected base (${operandBase})`,
					})
					.optional()
					.or(z.literal("")),
			}),
		[operandBase],
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			binary: "",
			decimal: "",
			hex: "",
			operand: "",
		},
		mode: "onChange",
	});

	const { watch, setValue, reset, trigger } = form;
	const binary = watch("binary") ?? "";
	const decimal = watch("decimal") ?? "";
	const hex = watch("hex") ?? "";
	const operand = watch("operand") ?? "";

	const handleSetOperandBase = (val: OperandBase) => {
		setOperandBase(val);
		trigger("operand");
	};

	const [operation, setOperation] = useState<Op>("add");

	// Track which field was last changed
	const lastChanged = useRef<"binary" | "decimal" | "hex" | null>(null);

	// Synchronize fields based on last changed
	useEffect(() => {
		if (lastChanged.current === "binary") {
			if (binary === "") {
				setValue("decimal", "");
				setValue("hex", "");
			} else {
				const dec = Number.parseInt(binary, 2);
				if (!Number.isNaN(dec)) {
					setValue("decimal", dec.toString(10), { shouldTouch: false });
					setValue("hex", dec.toString(16).toUpperCase(), {
						shouldTouch: false,
					});
				}
			}
		} else if (lastChanged.current === "decimal") {
			if (decimal === "") {
				setValue("binary", "");
				setValue("hex", "");
			} else {
				const dec = Number.parseInt(decimal, 10);
				if (!Number.isNaN(dec)) {
					setValue("binary", dec.toString(2), { shouldTouch: false });
					setValue("hex", dec.toString(16).toUpperCase(), {
						shouldTouch: false,
					});
				}
			}
		} else if (lastChanged.current === "hex") {
			if (hex === "") {
				setValue("binary", "");
				setValue("decimal", "");
			} else {
				const dec = Number.parseInt(hex, 16);
				if (!Number.isNaN(dec)) {
					setValue("decimal", dec.toString(10), { shouldTouch: false });
					setValue("binary", dec.toString(2), { shouldTouch: false });
				}
			}
		}
	}, [binary, decimal, hex, setValue]);

	const handleClear = () => {
		reset();
		lastChanged.current = null;
	};

	const handleOperate = () => {
		const dec = Number.parseInt(decimal || "0", 10);

		let opVal = 0;
		if (operation !== "not") {
			switch (operandBase) {
				case "hex":
					opVal = Number.parseInt(operand || "0", 16);
					break;
				case "bin":
					opVal = Number.parseInt(operand || "0", 2);
					break;
				default:
					opVal = Number.parseInt(operand || "0", 10);
			}
		}
		if (Number.isNaN(dec) || (operation !== "not" && Number.isNaN(opVal))) {
			// Let zod/react-hook-form show the error
			trigger("operand");
			return;
		}
		if (
			Math.abs(dec) > MAX_SAFE_INTEGER_FOR_BITWISE ||
			(operation !== "not" && Math.abs(opVal) > MAX_SAFE_INTEGER_FOR_BITWISE)
		) {
			// Handle overflow case
			return;
		}
		let result = dec;
		switch (operation) {
			case "shiftLeft":
				result = dec << opVal;
				break;
			case "shiftRight":
				result = dec >> opVal;
				break;
			case "add":
				result = dec + opVal;
				break;
			case "sub":
				result = dec - opVal;
				break;
			case "or":
				result = dec | opVal;
				break;
			case "xor":
				result = dec ^ opVal;
				break;
			case "and":
				result = dec & opVal;
				break;
			case "mult":
				result = dec * opVal;
				break;
			case "div":
				if (opVal === 0) {
					toast.error("Division by zero");
					return;
				}
				result = Math.trunc(dec / opVal);
				break;
			case "mod":
				result = dec % opVal;
				break;
			case "not":
				result = ~dec;
				break;
		}
		setValue("decimal", result.toString(10));
		lastChanged.current = "decimal";
	};

	// Helper functions for formatting
	function formatDecimal(val: string) {
		if (!val) return "";
		return val.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}
	function unformatDecimal(val: string) {
		return val.replace(/,/g, "");
	}
	function formatBinary(val: string) {
		if (!val) return "";
		return val.replace(/(.{4})/g, "$1_").replace(/_+$/, "");
	}

	function unformatBinary(val: string) {
		return val.replace(/_/g, "");
	}

	function formatHex(val: string) {
		if (!val) return "";
		return val.replace(/(.{2})/g, "$1_").replace(/_+$/, "");
	}

	function unformatHex(val: string) {
		return val.replace(/_/g, "");
	}

	function sanitizeOperand(val: string, base: OperandBase) {
		switch (base) {
			case "hex":
				return val.replace(/[^0-9a-fA-F]/g, "");
			case "bin":
				return val.replace(/[^01]/g, "");
			default:
				return val.replace(/\D/g, "");
		}
	}

	return (
		<div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed max-w-sm border-black shadow flex flex-col gap-6">
			<h2 className="text-lg font-bold mb-2">
				Binary / Decimal / Hex Calculator
			</h2>
			<Form {...form}>
				<form
					className="flex flex-col gap-4"
					onSubmit={(e) => e.preventDefault()}
				>
					<FormField
						control={form.control}
						name="binary"
						render={({ field }) => {
							const displayValue = formatBinary(field.value ?? "");
							return (
								<FormItem>
									{/* <FormLabel>Binary</FormLabel> */}
									<FormControl>
										<Input
											{...field}
											value={displayValue}
											placeholder="Binary. e.g. 1010"
											autoComplete="off"
											onFocus={(e) => {
												lastChanged.current = "binary";
												// Show unformatted value on focus
												field.onChange(unformatBinary(field.value ?? ""));
												e.target.value = unformatBinary(field.value ?? "");
											}}
											onBlur={(e) => {
												// On blur, format value
												field.onChange(unformatBinary(e.target.value ?? ""));
											}}
											onChange={(e) => {
												const raw = unformatBinary(e.target.value ?? "");
												field.onChange(raw);
												lastChanged.current = "binary";
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="decimal"
						render={({ field }) => {
							const displayValue = formatDecimal(field.value ?? "");
							return (
								<FormItem>
									{/* <FormLabel>Decimal</FormLabel> */}
									<FormControl>
										<Input
											{...field}
											value={displayValue}
											placeholder="Decimal. e.g. 10"
											autoComplete="off"
											onFocus={(e) => {
												lastChanged.current = "decimal";
												field.onChange(unformatDecimal(field.value ?? ""));
												e.target.value = unformatDecimal(field.value ?? "");
											}}
											onBlur={(e) => {
												field.onChange(unformatDecimal(e.target.value ?? ""));
											}}
											onChange={(e) => {
												const raw = unformatDecimal(e.target.value ?? "");
												field.onChange(raw);
												lastChanged.current = "decimal";
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="hex"
						render={({ field }) => {
							const displayValue = formatHex((field.value ?? "").toUpperCase());
							return (
								<FormItem>
									{/* <FormLabel>Hexadecimal</FormLabel> */}
									<FormControl>
										<Input
											{...field}
											value={displayValue}
											placeholder="Hexadecimal. e.g. A"
											autoComplete="off"
											onFocus={(e) => {
												lastChanged.current = "hex";
												field.onChange(unformatHex(field.value ?? ""));
												e.target.value = unformatHex(field.value ?? "");
											}}
											onBlur={(e) => {
												field.onChange(unformatHex(e.target.value ?? ""));
											}}
											onChange={(e) => {
												const raw = unformatHex(
													e.target.value ?? "",
												).toUpperCase();
												field.onChange(raw);
												lastChanged.current = "hex";
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							);
						}}
					/>
					<FormField
						control={form.control}
						name="operand"
						rules={{
							validate: (val: string | undefined) =>
								val && baseRegex[operandBase].test(val)
									? true
									: `Invalid ${operandBase} value`,
						}}
						render={({ field }) => (
							<FormItem>
								<div className="flex items-center gap-2">
									<FormControl>
										<Input
											{...field}
											placeholder="Operand"
											autoComplete="off"
											onChange={(e) => {
												const clean = sanitizeOperand(
													e.target.value,
													operandBase,
												);
												field.onChange(clean);
											}}
											disabled={operation === "not"}
										/>
									</FormControl>
									<Select
										value={operandBase}
										onValueChange={(val) =>
											handleSetOperandBase(val as OperandBase)
										}
									>
										<SelectTrigger className="w-[80px]">
											<SelectValue placeholder="dec" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="dec">dec</SelectItem>
											<SelectItem value="hex">hex</SelectItem>
											<SelectItem value="bin">bin</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>
					<div className="flex gap-2">
						<Select
							value={operation}
							onValueChange={(val) => setOperation(val as Op)}
						>
							<SelectTrigger className="w-[140px]">
								<SelectValue placeholder="Operation" />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(operationsMap).map(([key, value]) => (
									<SelectItem key={key} value={key}>
										{value.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Button type="button" onClick={handleOperate}>
							Execute
						</Button>
						<Button type="button" variant="outline" onClick={handleClear}>
							Clear
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
};

export default Calculator;
