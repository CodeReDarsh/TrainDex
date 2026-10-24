import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-2xl group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:bg-raised group-[.toaster]:text-foreground group-[.toaster]:shadow-[0_12px_32px_-12px_rgb(0_0_0/0.6)]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-foreground group-[.toast]:text-background",
          cancelButton: "group-[.toast]:bg-surface group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
