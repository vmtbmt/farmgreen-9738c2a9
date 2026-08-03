import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useFarmActions } from "@/lib/farm-store";

export function GardenDeleteButton({
  gardenId,
  gardenName,
}: {
  gardenId: string;
  gardenName: string;
}) {
  const actions = useFarmActions();
  const [isDeleting, setIsDeleting] = useState(false);

  const remove = async () => {
    setIsDeleting(true);
    try {
      await actions.deleteGarden(gardenId);
      toast.success(`Đã xóa khu vườn “${gardenName}”.`);
    } catch (error) {
      toast.error(
        `Không thể xóa khu vườn: ${(error as Error).message}. Nếu khu vườn đã có nhật ký, hãy lưu trữ thay vì xóa.`,
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Xóa khu vườn ${gardenName}`}
          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(event) => event.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa “{gardenName}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Khu vườn sẽ bị xóa vĩnh viễn. Nếu khu vườn còn nhật ký hoặc dữ liệu liên quan, bạn nên
            lưu trữ thay vì xóa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={remove}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
