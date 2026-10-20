import "dotenv/config";
import express from "express";
import { mintTokens, processWithdrawal } from "./mintTokens";
import { isProcessed, markProcessed } from "./eventStore";
import { PUBLIC_KEY } from "./address";

const app = express();

app.use(express.json());

const VAULT = PUBLIC_KEY;

interface NativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

const extractEvent = (body: any) => {
  if (Array.isArray(body.nativeTransfers) && body.nativeTransfers.length > 0) {
    const transfer: NativeTransfer = body.nativeTransfers[0];
    return {
      signature: body.signature as string,
      type: transfer.toUserAccount === VAULT ? "received_native_sol" : "sent_native_sol",
      fromAddress: transfer.fromUserAccount,
      toAddress: transfer.toUserAccount,
      amount: transfer.amount,
    };
  }
  return {
    signature: body.signature as string,
    type: body.type as string,
    fromAddress: body.fromAddress as string,
    toAddress: body.toAddress as string,
    amount: Number(body.amount),
  };
};

app.post("/helius", async (req, res) => {
  try {
    const { signature, type, fromAddress, toAddress, amount } = extractEvent(req.body);

    if (!signature || !fromAddress || !toAddress || !amount) {
      res.status(400).send("Missing required fields");
      return;
    }

    if (isProcessed(signature)) {
      res.status(200).send("Event already processed");
      return;
    }

    if (type === "received_native_sol") {
      await mintTokens(fromAddress, toAddress, amount);
    } else {
      await processWithdrawal(fromAddress, amount);
    }

    markProcessed({ signature, type, fromAddress, toAddress, amount, processedAt: new Date().toISOString() });
    res.send("Transaction successful");
  } catch (error) {
    console.error("Failed to process webhook:", error);
    res.status(500).send("Failed to process transaction");
  }
});

app.get("/health", (_req, res) => {
  res.send("OK");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
