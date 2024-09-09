import { useState } from "react";
import DefaultLayout from "@/layouts/default";

import { BrowserWallet, Wallet } from "@meshsdk/core";

import WalletConnectors from "@/components/WalletConnectors";
import Dashboard from "@/components/Dashboard";

export default function IndexPage() {
  const [wallet, setWallet] = useState<BrowserWallet>(); // connected wallet
  const [address, setAddress] = useState(""); // addr_...
  const [result, setResult] = useState("");

  function handleError(error: any) {
    console.log(error);
    setResult("An error occured, see console.log");
  }

  async function onConnectWallet({ name }: Wallet) {
    try {
      const wallet = await BrowserWallet.enable(name);
      setWallet(wallet);

      const address = await wallet.getChangeAddress();
      setAddress(address);
    } catch (error) {
      handleError(error);
    }
  }

  return (
    <DefaultLayout>
      <div className="flex justify-center overflow-hidden">
        <div className="flex flex-col gap-2 overflow-hidden">
          {wallet && address ? (
            // wallet connected: Show Dashboard
            <Dashboard wallet={wallet} address={address} setActionResult={setResult} onError={handleError} />
          ) : (
            // no wallet connected yet: Show Wallet button List
            <WalletConnectors onConnectWallet={onConnectWallet} />
          )}
          <span className="font-mono break-words whitespace-pre-wrap">{result}</span>
        </div>
      </div>
    </DefaultLayout>
  );
}
