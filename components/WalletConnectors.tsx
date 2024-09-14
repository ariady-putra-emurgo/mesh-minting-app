import { Button } from "@nextui-org/button";

import { Wallet } from "@meshsdk/core";
import { useWalletList } from "@meshsdk/react";

export default function WalletConnectors(props: { onConnectWallet: (wallet: Wallet) => Promise<void> }) {
  const { onConnectWallet } = props;

  const wallets = useWalletList().sort((l, r) => {
    return l.name.toUpperCase() < r.name.toUpperCase() ? -1 : 1;
  });

  return (
    <div className="flex flex-wrap gap-2">
      {wallets.map((wallet, w) => (
        <Button
          key={`wallet.${w}`}
          onClick={() => onConnectWallet(wallet)}
          className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize"
          radius="full"
        >
          {wallet.name}
        </Button>
      ))}
    </div>
  );
}
