/**
 * LINE User Search and Select Component
 * Used in customer management to link LINE users to customers
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, MessageCircle, User, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/components/ui/use-toast';
import debounce from 'lodash/debounce';

interface LineUser {
  id: string;
  line_user_id: string;
  display_name: string;
  picture_url?: string;
  customer_id?: string | null;
}

interface LineUserSearchSelectProps {
  customerId: string;
  onLinkSuccess: () => void;
  disabled?: boolean;
}

export function LineUserSearchSelect({
  customerId,
  onLinkSuccess,
  disabled = false
}: LineUserSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lineUsers, setLineUsers] = useState<LineUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const { toast } = useToast();

  // Debounced search function
  const searchLineUsers = useMemo(
    () => debounce(async (search: string) => {
      if (!search || search.length < 1) {
        setLineUsers([]);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          search: search,
          limit: '10',
          includeLinked: 'false'
        });

        const response = await fetch(`/api/line/users?${params}`);
        if (response.ok) {
          const data = await response.json();
          setLineUsers(data.lineUsers || []);
        } else {
          const errorData = await response.json();
          toast({
            title: "Search failed",
            description: errorData.error || "Failed to search LINE users",
            variant: "destructive"
          });
          setLineUsers([]);
        }
      } catch (error) {
        console.error('Error searching LINE users:', error);
        toast({
          title: "Search error",
          description: "An error occurred while searching",
          variant: "destructive"
        });
        setLineUsers([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [toast]
  );

  useEffect(() => {
    searchLineUsers(searchTerm);
  }, [searchTerm, searchLineUsers]);

  const handleSelect = async (lineUser: LineUser) => {
    if (linking) return;

    setLinking(true);
    try {
      const response = await fetch(`/api/line/users/${lineUser.line_user_id}/link-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerId
        }),
      });

      if (response.ok) {
        toast({
          title: "LINE user linked",
          description: `Successfully linked ${lineUser.display_name} to this customer`,
        });
        setOpen(false);
        setSearchTerm("");
        setLineUsers([]);
        onLinkSuccess();
      } else {
        const errorData = await response.json();
        toast({
          title: "Link failed",
          description: errorData.error || "Failed to link LINE user",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error linking LINE user:', error);
      toast({
        title: "Link error",
        description: "An error occurred while linking",
        variant: "destructive"
      });
    } finally {
      setLinking(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || linking}
          className="w-full justify-start gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Link LINE User</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search LINE users by name..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList className="max-h-[300px] overflow-y-auto">
            {loading && searchTerm.length >= 1 && (
              <CommandEmpty>
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              </CommandEmpty>
            )}
            {!loading && searchTerm.length >= 1 && lineUsers.length === 0 && (
              <CommandEmpty>No LINE users found.</CommandEmpty>
            )}
            {searchTerm.length < 1 && (
              <CommandEmpty>Type to search LINE users...</CommandEmpty>
            )}

            {/* Search results */}
            {searchTerm.length >= 1 && lineUsers.length > 0 && (
              <CommandGroup heading="LINE Users">
                {lineUsers.map((lineUser) => (
                  <CommandItem
                    key={lineUser.id}
                    value={lineUser.id}
                    onSelect={() => handleSelect(lineUser)}
                    className="flex items-center gap-3 py-3"
                    disabled={linking}
                  >
                    {lineUser.picture_url ? (
                      <img
                        src={lineUser.picture_url}
                        alt={lineUser.display_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{lineUser.display_name}</div>
                      <div className="text-sm text-muted-foreground font-mono truncate">
                        {lineUser.line_user_id}
                      </div>
                    </div>
                    {linking && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
